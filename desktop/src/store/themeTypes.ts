export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ColorRegion =
  | 'primary'
  | 'secondary'
  | 'header'
  | 'sidebar'
  | 'background'
  | 'text'
  | 'accent';

export interface ColorRegions {
  primary: RGBAColor;
  secondary: RGBAColor;
  header: RGBAColor;
  sidebar: RGBAColor;
  background: RGBAColor;
  text: RGBAColor;
  accent: RGBAColor;
}

export interface ThemeSettings {
  darkMode: boolean;
  colorRegions: ColorRegions;
  backgroundImage: string;
  backgroundOpacity: number;
  glassEffect: boolean;
}

export interface ThemeContextType extends ThemeSettings {
  setDarkMode: (enabled: boolean) => void;
  setColorRegion: (region: ColorRegion, color: RGBAColor) => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setGlassEffect: (enabled: boolean) => void;
  resetTheme: () => void;
  resetColorRegion: (region: ColorRegion) => void;
  getRegionColor: (region: ColorRegion) => string;
}
