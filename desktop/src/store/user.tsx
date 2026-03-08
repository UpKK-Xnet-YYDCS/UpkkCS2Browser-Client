import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { UserSession, LoginResponse } from '@/types';
import { 
  saveCredentials, 
  loadCredentials, 
  clearCredentials,
  hasStoredCredentials 
} from '@/services/secureStorage';

const FORUM_URL = 'https://bbs.upkk.com';
const LOGIN_ENDPOINT = '/plugin.php?id=xnet_core_api:xproj_login';

// State type
interface UserState {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
  showLoginModal: boolean;
  rememberMe: boolean;
  isAutoLoggingIn: boolean;
  hasStoredCredentials: boolean;
}

// Action types
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: UserSession | null }
  | { type: 'SHOW_LOGIN_MODAL'; payload: boolean }
  | { type: 'SET_REMEMBER_ME'; payload: boolean }
  | { type: 'SET_AUTO_LOGGING_IN'; payload: boolean }
  | { type: 'SET_HAS_STORED_CREDENTIALS'; payload: boolean }
  | { type: 'LOGOUT' };

// Load remember me preference (defaults to true)
const loadRememberMe = (): boolean => {
  try {
    const stored = localStorage.getItem('xproj-remember-me');
    // Default to true if not set
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

// Initial state - user starts as null, will be set via auto-login
const initialState: UserState = {
  user: null, // Don't load from localStorage - always re-login with encrypted credentials
  isLoading: false,
  error: null,
  showLoginModal: false,
  rememberMe: loadRememberMe(),
  isAutoLoggingIn: false,
  hasStoredCredentials: false,
};

// Reducer
function userReducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    case 'SHOW_LOGIN_MODAL':
      return { ...state, showLoginModal: action.payload };
    case 'SET_REMEMBER_ME':
      return { ...state, rememberMe: action.payload };
    case 'SET_AUTO_LOGGING_IN':
      return { ...state, isAutoLoggingIn: action.payload };
    case 'SET_HAS_STORED_CREDENTIALS':
      return { ...state, hasStoredCredentials: action.payload };
    case 'LOGOUT':
      return { ...state, user: null };
    default:
      return state;
  }
}

// Context
interface UserContextType extends UserState {
  login: (steamid64: string, securecode: string, shouldRemember?: boolean) => Promise<boolean>;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  clearError: () => void;
  setRememberMe: (value: boolean) => void;
  attemptAutoLogin: () => Promise<boolean>;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const autoLoginAttempted = useRef(false);

  // Check for stored credentials on mount
  useEffect(() => {
    const checkStoredCredentials = async () => {
      try {
        const hasCredentials = await hasStoredCredentials();
        dispatch({ type: 'SET_HAS_STORED_CREDENTIALS', payload: hasCredentials });
      } catch (error) {
        console.error('[UserProvider] Failed to check stored credentials:', error);
      }
    };
    checkStoredCredentials();
  }, []);

  // Persist user session changes
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('xproj-user-session', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('xproj-user-session');
    }
  }, [state.user]);

  // Persist remember me preference
  useEffect(() => {
    localStorage.setItem('xproj-remember-me', state.rememberMe ? 'true' : 'false');
  }, [state.rememberMe]);

  const login = useCallback(async (steamid64: string, securecode: string, shouldRemember?: boolean): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const postBody = new URLSearchParams({
      steamid64,
      securecode,
    }).toString();

    console.log('[Login] 开始登录请求...');
    console.log('[Login] URL:', `${FORUM_URL}${LOGIN_ENDPOINT}`);
    console.log('[Login] SteamID64:', steamid64);

    // Helper function to process login response
    const processLoginResponse = async (data: LoginResponse, responseText: string): Promise<boolean> => {
      console.log('[Login] 响应JSON:', responseText);
      console.log('[Login] 解析后数据:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log('[Login] 登录成功!');
        console.log('[Login] 用户信息:', JSON.stringify(data.data, null, 2));
        const userSession: UserSession = {
          uid: data.data.uid,
          username: data.data.username,
          steamid64: data.data.steamid64,
          user_auth: data.data.user_auth,
          isLogin: data.data.isLogin ?? true, // Default to true if login was successful
        };
        dispatch({ type: 'SET_USER', payload: userSession });
        dispatch({ type: 'SHOW_LOGIN_MODAL', payload: false });
        
        // Save credentials if remember me is enabled
        if (shouldRemember) {
          console.log('[Login] 保存加密凭据...');
          try {
            const saveResult = await saveCredentials(steamid64, securecode);
            if (saveResult.success) {
              console.log('[Login] 凭据已安全保存');
              dispatch({ type: 'SET_HAS_STORED_CREDENTIALS', payload: true });
            } else {
              console.warn('[Login] 保存凭据失败:', saveResult.message);
            }
          } catch (saveError) {
            console.error('[Login] 保存凭据异常:', saveError);
          }
        }
        
        return true;
      } else {
        console.error('[Login] 登录失败!');
        console.error('[Login] 错误信息:', data.message);
        console.error('[Login] 完整响应:', JSON.stringify(data, null, 2));
        dispatch({ type: 'SET_ERROR', payload: data.message || '登录失败' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return false;
      }
    };

    try {
      // Try using Tauri HTTP plugin first (bypasses CORS restrictions)
      try {
        console.log('[Login] 尝试使用 Tauri HTTP 插件...');
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
        const response = await tauriFetch(`${FORUM_URL}${LOGIN_ENDPOINT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: postBody,
        });

        console.log('[Login] Tauri HTTP 响应状态:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Login] HTTP错误响应:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`);
        }

        const responseText = await response.text();
        let data: LoginResponse;
        try {
          data = JSON.parse(responseText);
        } catch (parseErr) {
          console.error('[Login] JSON解析失败!');
          console.error('[Login] 原始响应:', responseText);
          console.error('[Login] 解析错误:', parseErr);
          throw new Error(`响应解析失败: ${responseText.substring(0, 100)}`);
        }
        return await processLoginResponse(data, responseText);
      } catch (tauriErr) {
        // Only fall back to regular fetch if Tauri module is not available
        // Check if it's a module import error vs an actual request error
        const errMsg = tauriErr instanceof Error ? tauriErr.message : String(tauriErr);
        const isModuleError = errMsg.includes('module') || 
                              errMsg.includes('import') || 
                              errMsg.includes('Cannot find') ||
                              errMsg.includes('Failed to resolve');
        
        if (!isModuleError) {
          // This is an actual request error, not a module loading error - throw it
          console.error('[Login] Tauri HTTP 请求错误:', tauriErr);
          throw tauriErr;
        }
        console.log('[Login] Tauri HTTP 不可用, 回退到 fetch...');
      }

      // Fallback to regular fetch (may fail due to CORS in browser environments)
      console.log('[Login] 使用标准 fetch...');
      const response = await fetch(`${FORUM_URL}${LOGIN_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: postBody,
      });

      console.log('[Login] Fetch 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Login] HTTP错误响应:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`);
      }

      const responseText = await response.text();
      let data: LoginResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[Login] JSON解析失败!');
        console.error('[Login] 原始响应:', responseText);
        console.error('[Login] 解析错误:', parseErr);
        throw new Error(`响应解析失败: ${responseText.substring(0, 100)}`);
      }
      return await processLoginResponse(data, responseText);
    } catch (error) {
      console.error('[Login] 登录请求异常!');
      console.error('[Login] 错误类型:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Login] 错误信息:', error instanceof Error ? error.message : String(error));
      console.error('[Login] 错误详情:', error);
      
      // Build detailed error message for UI
      let message: string;
      if (error instanceof Error) {
        // Check for network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          message = `网络请求失败: 无法连接到服务器。请检查网络连接。(${error.message})`;
        } else if (error.message.includes('CORS')) {
          message = `跨域请求被阻止: ${error.message}`;
        } else {
          message = error.message;
        }
      } else {
        message = `登录请求失败: ${String(error)}`;
      }
      
      dispatch({ type: 'SET_ERROR', payload: message });
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    // Clear stored credentials in background (non-blocking)
    clearCredentials()
      .then(() => {
        dispatch({ type: 'SET_HAS_STORED_CREDENTIALS', payload: false });
        console.log('[Logout] 已清除保存的凭据');
      })
      .catch((error) => {
        console.error('[Logout] 清除凭据失败:', error);
      });
  }, []);

  const openLoginModal = useCallback(() => {
    dispatch({ type: 'SHOW_LOGIN_MODAL', payload: true });
  }, []);

  const closeLoginModal = useCallback(() => {
    dispatch({ type: 'SHOW_LOGIN_MODAL', payload: false });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const setRememberMe = useCallback((value: boolean) => {
    dispatch({ type: 'SET_REMEMBER_ME', payload: value });
  }, []);

  // Auto login using stored credentials
  const attemptAutoLogin = useCallback(async (): Promise<boolean> => {
    if (autoLoginAttempted.current) {
      console.log('[AutoLogin] 已尝试过自动登录，跳过');
      return false;
    }
    autoLoginAttempted.current = true;

    console.log('[AutoLogin] 尝试自动登录...');
    dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: true });

    try {
      // Check if we have stored credentials
      const hasCredentials = await hasStoredCredentials();
      if (!hasCredentials) {
        console.log('[AutoLogin] 没有保存的凭据');
        dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
        return false;
      }

      // Load credentials
      const result = await loadCredentials();
      if (!result.success || !result.steamid64 || !result.securecode) {
        console.log('[AutoLogin] 加载凭据失败:', result.message);
        dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
        return false;
      }

      console.log('[AutoLogin] 凭据加载成功，尝试登录...');
      
      // Attempt login (don't re-save credentials)
      const loginSuccess = await login(result.steamid64, result.securecode, false);
      
      dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
      
      if (loginSuccess) {
        console.log('[AutoLogin] 自动登录成功!');
      } else {
        console.log('[AutoLogin] 自动登录失败，可能需要重新登录');
      }
      
      return loginSuccess;
    } catch (error) {
      console.error('[AutoLogin] 自动登录异常:', error);
      dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
      return false;
    }
  }, [login]);

  // Auto-login on mount if stored credentials exist
  // Always re-login with encrypted credentials on startup (don't rely on localStorage session)
  useEffect(() => {
    if (state.hasStoredCredentials && !state.user && !autoLoginAttempted.current) {
      attemptAutoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref check prevents re-execution
  }, [state.hasStoredCredentials, state.user]);

  const value: UserContextType = {
    ...state,
    login,
    logout,
    openLoginModal,
    closeLoginModal,
    clearError,
    setRememberMe,
    attemptAutoLogin,
    isLoggedIn: !!state.user?.isLogin,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Hook to use user context
export function useUserStore(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserStore must be used within a UserProvider');
  }
  return context;
}
