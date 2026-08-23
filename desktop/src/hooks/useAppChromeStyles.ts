import { useMemo } from 'react';
import { rgbaToCss } from '@/store/themeUtils';
import type { ThemeContextType } from '@/store/theme';

export function useAppChromeStyles(theme: ThemeContextType) {
  const backgroundStyle = useMemo(() => theme.backgroundImage
    ? {
        backgroundImage: `url(${theme.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        backgroundColor: rgbaToCss(theme.colorRegions.background),
      }, [theme.backgroundImage, theme.colorRegions.background]);

  const overlayOpacity = useMemo(
    () => theme.backgroundImage ? (100 - theme.backgroundOpacity) / 100 : 0,
    [theme.backgroundImage, theme.backgroundOpacity],
  );

  const primaryColor = useMemo(() => rgbaToCss(theme.colorRegions.primary), [theme.colorRegions.primary]);
  const secondaryColor = useMemo(() => rgbaToCss(theme.colorRegions.secondary), [theme.colorRegions.secondary]);
  const headerColor = useMemo(() => rgbaToCss(theme.colorRegions.header), [theme.colorRegions.header]);

  const overlayStyle = useMemo(() => ({
    backgroundColor: rgbaToCss(theme.colorRegions.background),
    opacity: overlayOpacity,
  }), [theme.colorRegions.background, overlayOpacity]);

  const logoGradient = useMemo(
    () => ({ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }),
    [primaryColor, secondaryColor],
  );

  const titleColor = useMemo(
    () => ({ color: rgbaToCss(theme.colorRegions.text) }),
    [theme.colorRegions.text],
  );

  return { backgroundStyle, overlayStyle, headerColor, logoGradient, titleColor };
}
