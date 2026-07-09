import { createContext } from 'react';
import type { AppContextType } from './index';

export const AppContext = createContext<AppContextType | null>(null);
