import type { ColorRegion, RGBAColor } from './themeTypes';

export const rgbaToCss = (color: RGBAColor): string => {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
};

export const hexToRgba = (hex: string, alpha: number = 1): RGBAColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: alpha,
    };
  }
  return { r: 139, g: 92, b: 246, a: 1 };
};

export const rgbaToHex = (color: RGBAColor): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
};

export const colorRegionLabels: Record<ColorRegion, string> = {
  primary: '主色调',
  secondary: '辅助色',
  header: '顶部栏',
  sidebar: '卡片背景',
  background: '页面背景',
  text: '文字颜色',
  accent: '强调色',
};

export const presetColors = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '粉色', value: '#ec4899' },
  { name: '绿色', value: '#10b981' },
  { name: '橙色', value: '#f97316' },
  { name: '红色', value: '#ef4444' },
  { name: '青色', value: '#06b6d4' },
  { name: '黄色', value: '#eab308' },
  { name: '靛蓝', value: '#6366f1' },
  { name: '白色', value: '#ffffff' },
  { name: '黑色', value: '#000000' },
  { name: '灰色', value: '#6b7280' },
];

export function rgbaChannelGradient(channel: 'r' | 'g' | 'b' | 'a', color: RGBAColor): string {
  if (channel === 'r') return 'linear-gradient(to right, rgb(0, ' + color.g + ', ' + color.b + '), rgb(255, ' + color.g + ', ' + color.b + '))';
  if (channel === 'g') return 'linear-gradient(to right, rgb(' + color.r + ', 0, ' + color.b + '), rgb(' + color.r + ', 255, ' + color.b + '))';
  if (channel === 'b') return 'linear-gradient(to right, rgb(' + color.r + ', ' + color.g + ', 0), rgb(' + color.r + ', ' + color.g + ', 255))';
  return 'linear-gradient(to right, rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', 0), rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', 1))';
}

export function isPresetColorSelected(color: RGBAColor, hex: string): boolean {
  return rgbaToHex(color).toLowerCase() === hex.toLowerCase();
}

export function rgbaAlphaPercent(alpha: number): number {
  return Math.round(alpha * 100);
}
