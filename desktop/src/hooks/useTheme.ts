import { useContext } from 'react';
import { ThemeContext } from '@/store/themeContext';
import type { ThemeContextType } from '@/store/theme';

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
