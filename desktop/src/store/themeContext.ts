import { createContext } from 'react';
import type { ThemeContextType } from './theme';

export const ThemeContext = createContext<ThemeContextType | null>(null);
