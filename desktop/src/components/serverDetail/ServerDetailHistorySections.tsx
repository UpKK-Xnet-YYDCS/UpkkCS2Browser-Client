import { lazy, Suspense } from 'react';
import { useI18n } from '@/hooks/useI18n';

const PlayerHistoryChart = lazy(() => import('../PlayerHistoryChart').then(module => ({ default: module.PlayerHistoryChart })));
const MapHistory = lazy(() => import('../MapHistory').then(module => ({ default: module.MapHistory })));
const QueryRecords = lazy(() => import('../QueryRecords').then(module => ({ default: module.QueryRecords })));

interface ServerDetailHistorySectionsProps {
  serverId?: string;
  serverAddress?: string;
}

export function ServerDetailHistorySections({
  serverId,
  serverAddress,
}: ServerDetailHistorySectionsProps) {
  const { t } = useI18n();

  return (
    <>
      {serverId && (
        <div className="mb-6">
          <Suspense fallback={<div className="h-32" />}>
            <PlayerHistoryChart serverId={serverId} />
          </Suspense>
        </div>
      )}

      {serverAddress && (
        <div className="mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t.serverDetailMapHistory}</h3>
            </div>
            <Suspense fallback={<div className="h-20" />}>
              <MapHistory serverAddress={serverAddress} />
            </Suspense>
          </div>
        </div>
      )}

      {serverAddress && (
        <div className="mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-semibold text-gray-900 dark:text-white">📊 {t.queryRecordsTitle}</h3>
              </div>
              <p className="text-xs leading-5 text-blue-700 dark:text-blue-300 md:max-w-sm md:text-right">
                {t.queryRecordsNodeNotice}
              </p>
            </div>
            <Suspense fallback={<div className="h-24" />}>
              <QueryRecords serverAddress={serverAddress} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
