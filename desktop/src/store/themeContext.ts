import { createContext } from 'react';
import type { ThemeContextType } from './themeTypes';

export const ThemeContext = createContext<ThemeContextType | null>(null);
