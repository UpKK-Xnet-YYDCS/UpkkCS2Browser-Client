import { createContext } from 'react';
import type { UserState } from './userState';

export interface UserContextType extends UserState {
  login: (steamid64: string, securecode: string, shouldRemember?: boolean) => Promise<boolean>;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  clearError: () => void;
  setRememberMe: (value: boolean) => void;
  attemptAutoLogin: () => Promise<boolean>;
  isLoggedIn: boolean;
}

export const UserContext = createContext<UserContextType | null>(null);

