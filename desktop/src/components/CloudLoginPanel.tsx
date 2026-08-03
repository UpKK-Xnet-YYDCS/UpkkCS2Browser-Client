import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { rgbaToCss } from '@/store/themeUtils';
import type { Translations } from '@/store/i18n';
import type { CloudLoginProvider } from '@/types/cloudAuth';

interface CloudLoginPanelProps {
  icon: ReactNode;
  title: string;
  description: string;
  footer?: string;
}

interface ProviderButton {
  provider: CloudLoginProvider;
  icon: () => ReactNode;
  className: string;
}

const SteamIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63l3.18-4.608c-.047-.002-.094-.002-.142-.002-1.633 0-3.092-.745-4.055-1.913L.957 13.96c.227 4.554 3.946 8.195 8.543 8.518L12 18.893l2.5 3.585c4.597-.323 8.316-3.964 8.543-8.518l-7.118 3.147c-.963 1.168-2.422 1.913-4.055 1.913-.048 0-.095 0-.142.002l3.18 4.608C20.128 22.328 24 17.623 24 12 24 5.373 18.627 0 12 0zm-1.67 14.889c-.854.378-1.846.29-2.612-.283l-1.92-.85c.245.734.702 1.382 1.32 1.858.618.476 1.366.748 2.142.777 1.633.057 3.077-.983 3.44-2.479a3.24 3.24 0 00-.08-1.608 3.126 3.126 0 00-.79-1.325l1.921.85c.562.877.642 1.985.21 2.94a3.188 3.188 0 01-1.631 1.62z" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
  </svg>
);

const UpkkIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

const PROVIDER_BUTTONS: ProviderButton[] = [
  { provider: 'steam', icon: SteamIcon, className: 'border-transparent bg-[#171a21] text-white hover:bg-[#252a35]' },
  { provider: 'upkk', icon: UpkkIcon, className: 'border-transparent bg-[#e74c3c] text-white hover:bg-[#cf4032]' },
  { provider: 'google', icon: GoogleIcon, className: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' },
  { provider: 'discord', icon: DiscordIcon, className: 'border-transparent bg-[#5865F2] text-white hover:bg-[#4752c4]' },
];

function providerLabel(provider: CloudLoginProvider, t: Translations): string {
  switch (provider) {
    case 'steam': return t.loginWithSteam;
    case 'upkk': return t.loginWithUpkk;
    case 'google': return t.loginWithGoogle;
    case 'discord': return t.loginWithDiscord;
  }
}

export function CloudLoginPanel({ icon, title, description, footer }: CloudLoginPanelProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { isReady, loginPending, pendingProvider, error, login } = useCloudAuth();
  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const cardColor = rgbaToCss(theme.colorRegions.sidebar);
  const textColor = rgbaToCss(theme.colorRegions.text);

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
      <section className="m-auto w-full max-w-md rounded-2xl p-8 text-center shadow-xl" style={{ backgroundColor: cardColor }}>
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full text-white" style={{ backgroundColor: primaryColor }}>
          {icon}
        </div>
        <h1 className="mb-2 text-2xl font-bold" style={{ color: textColor }}>{title}</h1>
        <p className="mb-2 text-gray-500 dark:text-gray-400">{description}</p>
        <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">{t.loginChooseProvider}</p>

        <div className="flex flex-col gap-3">
          {PROVIDER_BUTTONS.map(({ provider, icon: ProviderIcon, className }) => {
            const active = pendingProvider === provider;
            return (
              <button
                key={provider}
                type="button"
                onClick={() => void login(provider)}
                disabled={!isReady || loginPending}
                aria-busy={active}
                className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-6 py-3 font-medium transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${className}`}
              >
                <span className="shrink-0"><ProviderIcon /></span>
                <span className="min-w-0 leading-5">{providerLabel(provider, t)}</span>
                {active && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {loginPending && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-500" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{t.loginSubmitting}</span>
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <p className="mt-4 text-xs text-gray-400">{footer || t.syncFavoritesHint}</p>
      </section>
    </div>
  );
}
