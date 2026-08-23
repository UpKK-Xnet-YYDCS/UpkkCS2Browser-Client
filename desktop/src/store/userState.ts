import type { UserSession } from '@/types';
import { REMEMBER_ME_STORAGE_KEY, readRememberMeFlag } from '@/services/userPersist';

export interface UserState {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
  showLoginModal: boolean;
  rememberMe: boolean;
  isAutoLoggingIn: boolean;
  hasStoredCredentials: boolean;
}

export type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: UserSession | null }
  | { type: 'SHOW_LOGIN_MODAL'; payload: boolean }
  | { type: 'SET_REMEMBER_ME'; payload: boolean }
  | { type: 'SET_AUTO_LOGGING_IN'; payload: boolean }
  | { type: 'SET_HAS_STORED_CREDENTIALS'; payload: boolean }
  | { type: 'LOGOUT' };

export function loadRememberMe(): boolean {
  try {
    return readRememberMeFlag(localStorage.getItem(REMEMBER_ME_STORAGE_KEY));
  } catch {
    return true;
  }
}

export const initialUserState: UserState = {
  user: null,
  isLoading: false,
  error: null,
  showLoginModal: false,
  rememberMe: loadRememberMe(),
  isAutoLoggingIn: false,
  hasStoredCredentials: false,
};

export function userReducer(state: UserState, action: UserAction): UserState {
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

