import { useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  hasStoredCredentials,
} from '@/services/secureStorage';
import {
  persistRememberMeFlag,
  persistUserSession,
} from '@/services/userPersist';
import { logInfo, logDebug, logWarn } from '@/services/operationLog';
import { UserContext, type UserContextType } from './userContext';
import { initialUserState, userReducer } from './userState';

export type { UserContextType } from './userContext';

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialUserState);
  const autoLoginAttempted = useRef(false);

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

  useEffect(() => {
    persistUserSession(state.user);
  }, [state.user]);

  useEffect(() => {
    persistRememberMeFlag(state.rememberMe);
  }, [state.rememberMe]);

  const login = useCallback(async (steamid64: string, securecode: string, shouldRemember?: boolean): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const [
      { authenticateForumUser, forumLoginRequestErrorMessage, persistRememberedForumCredentials },
      { requestForumLogin },
    ] = await Promise.all([
      import('@/services/forumAuthFlow'),
      import('@/services/forumLogin'),
    ]);
    const attempt = await authenticateForumUser(steamid64, securecode, requestForumLogin);
    if (attempt.type === 'failed') {
      console.error('[Login] 登录请求异常!');
      console.error('[Login] 错误类型:', attempt.error instanceof Error ? attempt.error.constructor.name : typeof attempt.error);
      console.error('[Login] 错误信息:', attempt.error instanceof Error ? attempt.error.message : String(attempt.error));
      console.error('[Login] 错误详情:', attempt.error);
      dispatch({ type: 'SET_ERROR', payload: forumLoginRequestErrorMessage(attempt.error) });
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }

    logDebug('Login', '响应: success=' + attempt.data.success + ', hasData=' + !!attempt.data.data);
    if (attempt.type === 'rejected') {
      console.error('[Login] 登录失败!');
      console.error('[Login] 错误信息:', attempt.data.message);
      console.error('[Login] 完整响应:', JSON.stringify(attempt.data, null, 2));
      dispatch({ type: 'SET_ERROR', payload: attempt.message });
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }

    logInfo('Login', '登录成功!');
    logDebug('Login', '用户: ' + attempt.session.username + ' (uid: ' + attempt.session.uid + ')');
    dispatch({ type: 'SET_USER', payload: attempt.session });
    dispatch({ type: 'SHOW_LOGIN_MODAL', payload: false });

    if (shouldRemember) {
      logDebug('Login', '保存加密凭据...');
      const persistResult = await persistRememberedForumCredentials(steamid64, securecode, saveCredentials);
      if (persistResult.type === 'saved') {
        logInfo('Login', '凭据已安全保存');
        dispatch({ type: 'SET_HAS_STORED_CREDENTIALS', payload: true });
      } else if (persistResult.type === 'failed') {
        logWarn('Login', '保存凭据失败: ' + persistResult.message);
      } else {
        console.error('[Login] 保存凭据异常:', persistResult.error);
      }
    }

    return true;
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    clearCredentials()
      .then(() => {
        dispatch({ type: 'SET_HAS_STORED_CREDENTIALS', payload: false });
        logInfo('Logout', '已清除保存的凭据');
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

  const attemptAutoLogin = useCallback(async (): Promise<boolean> => {
    if (autoLoginAttempted.current) {
      logDebug('AutoLogin', '已尝试过自动登录，跳过');
      return false;
    }
    autoLoginAttempted.current = true;

    logInfo('AutoLogin', '尝试自动登录...');
    dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: true });

    try {
      const { prepareForumAutoLogin } = await import('@/services/forumAuthFlow');
      const prep = await prepareForumAutoLogin({ hasStoredCredentials, loadCredentials });
      if (prep.type === 'no-credentials') {
        logDebug('AutoLogin', '没有保存的凭据');
        dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
        return false;
      }
      if (prep.type === 'load-failed') {
        logDebug('AutoLogin', '加载凭据失败: ' + prep.message);
        dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
        return false;
      }

      logDebug('AutoLogin', '凭据加载成功，尝试登录...');
      const loginSuccess = await login(prep.steamid64, prep.securecode, false);
      dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
      if (loginSuccess) {
        logInfo('AutoLogin', '自动登录成功!');
      } else {
        logWarn('AutoLogin', '自动登录失败，可能需要重新登录');
      }
      return loginSuccess;
    } catch (error) {
      console.error('[AutoLogin] 自动登录异常:', error);
      dispatch({ type: 'SET_AUTO_LOGGING_IN', payload: false });
      return false;
    }
  }, [login]);

  useEffect(() => {
    if (state.hasStoredCredentials && !state.user && !autoLoginAttempted.current) {
      attemptAutoLogin();
    }
  }, [attemptAutoLogin, state.hasStoredCredentials, state.user]);

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
