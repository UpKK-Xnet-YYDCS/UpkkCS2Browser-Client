import { createContext } from 'react';
import type { UserContextType } from './user';

export const UserContext = createContext<UserContextType | null>(null);
