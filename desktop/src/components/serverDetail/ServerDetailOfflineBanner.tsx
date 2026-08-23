import { useI18n } from '@/hooks/useI18n';
import { ClockIcon, WifiOffIcon } from '../serverDetailIcons';

interface ServerDetailOfflineBannerProps {
  offlineDuration: string;
  lastResponseText: string;
}

export function ServerDetailOfflineBanner({
  offlineDuration,
  lastResponseText,
}: ServerDetailOfflineBannerProps) {
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden mb-5 p-4 rounded-xl bg-slate-950 text-slate-100 border border-white/10 shadow-lg">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/40 via-white/10 to-transparent" />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-4 items-start">
        <div className="grid place-items-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 text-slate-200">
          <WifiOffIcon />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-red-200/80">{t.offline}</div>
          <h3 className="mt-1 text-lg font-black text-white">{t.serverOfflineTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-300">{t.serverOfflineDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {offlineDuration && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white">
                <ClockIcon />
                <span>
                  <small className="block text-[11px] font-medium text-slate-400">{t.serverOfflineDuration}</small>
                  {offlineDuration}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white">
              <ClockIcon />
              <span>
                <small className="block text-[11px] font-medium text-slate-400">{t.serverLastResponse}</small>
                {lastResponseText}
              </span>
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 justify-self-start sm:justify-self-end rounded-full border border-red-400/20 bg-red-950/50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-200">
          <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.16)]" />
          {t.offline}
        </span>
      </div>
    </div>
  );
}
