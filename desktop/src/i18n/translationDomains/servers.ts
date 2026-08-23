export interface ServerTranslations {
  // Server card/list
  players: string;
  ping: string;
  localA2SLatency: string;
  localA2SQueued: string;
  localA2SChecking: string;
  localA2SUnavailable: string;
  localA2SFailed: string;
  latencyLimit: string;
  latencyFilterAll: string;
  latencyFilterUnknown: string;
  latencySettings: string;
  latencyDeepScan: string;
  latencyDeepScanDesc: string;
  latencyWorkerCount: string;
  latencyWorkerCountDesc: string;
  latencyRetryCount: string;
  latencyRetryCountDesc: string;
  latencyRetryDelay: string;
  latencyRetryDelayDesc: string;
  latencyA2STimeout: string;
  latencyA2STimeoutDesc: string;
  latencyProbeOpen: string;
  latencyProbeTitle: string;
  latencyProbeInterval: string;
  latencyProbeDuration: string;
  latencyProbeTimeout: string;
  latencyProbeRetries: string;
  latencyProbeStart: string;
  latencyProbeStop: string;
  latencyProbeRunning: string;
  latencyProbeIdle: string;
  latencyProbeChart: string;
  latencyProbeNoSamples: string;
  latencyProbeNoTarget: string;
  latencyProbeRtt: string;
  latencyProbeSent: string;
  latencyProbeReceived: string;
  latencyProbePacketLoss: string;
  latencyProbeAttemptLoss: string;
  latencyProbeAverage: string;
  latencyProbeMin: string;
  latencyProbeMax: string;
  latencyProbeStability: string;
  latencyProbeSample: string;
  latencyProbeFailureReason: string;
  map: string;
  category: string;
  version: string;
  
  // Filters
  oceania: string;
  searchPlaceholder: string;
  localFavorites: string;
  addToLocalFavorites: string;
  removeFromLocalFavorites: string;
  addToCloudFavorites: string;
  removeFromCloudFavorites: string;
  searchLocalFavorites: string;
  addLocalServer: string;
  addLocalServerDesc: string;
  addLocalServerSuccess: string;
  addLocalServerDuplicate: string;
  invalidAddressFormat: string;
  exportFavorites: string;
  importFavorites: string;
  exportFavoritesSuccess: string;
  
  // Game type filter
  gameAll: string;
  gameCs2: string;
  gameCsgo: string;
  
  // Pagination
  perPage: string;
  page: string;
  
  // View modes
  
  // User status
  login: string;
  logout: string;
  
  // Steam client
  steamClientSetting: string;
  steamClientSettingDesc: string;
  steamInternational: string;
  steamChina: string;
  steamSwitchConfirmTitle: string;
  steamSwitchToChina: string;
  steamSwitchToChinaWarning: string;
  steamSwitchToInternational: string;
  steamSwitchedToInternational: string;
  steamSwitchedToChina: string;
  steamConfirm: string;
  steamCancel: string;
  steamHeaderTooltipInternational: string;
  steamHeaderTooltipChina: string;
  
  // Server details
  serverAddress: string;
  joinServer: string;
  copyAddress: string;
  playerHistory: string;
  
  // Stats bar
  totalServers: string;
  
  // Auto-join
  autoJoinTitle: string;
  autoJoinStart: string;
  autoJoinStop: string;
  autoJoinMonitoring: string;
  autoJoinChecking: string;
  autoJoinWaiting: string;
  autoJoinDetected: string;
  autoJoinCheckFailed: string;
  autoJoinMinSlots: string;
  autoJoinSlots: string;
  autoJoinTrigger: string;
  autoJoinTriggerDesc: string;
  autoJoinCurrentPlayers: string;
  autoJoinRemaining: string;
  autoJoinNextCheck: string;
  autoJoinSeconds: string;
  autoJoinButton: string;
  autoJoinCheckInterval: string;

  // Multi-server (data consolidation)
  multiServerSelect: string;
  multiServerTitle: string;
  multiServerJoin: string;
  
  // Server detail modal
  serverDetailMap: string;
  serverDetailPlayers: string;
  serverDetailGame: string;
  serverDetailCategory: string;
  serverDetailCountry: string;
  serverDetailVersion: string;
  serverDetailLoad: string;
  serverDetailVac: string;
  serverDetailPassword: string;
  serverDetailMapHistory: string;
  serverDetailOnlinePlayers: string;
  serverDetailLoading: string;
  serverDetailNoPlayers: string;
  serverDetailLoginToView: string;
  serverDetailNotes: string;
  // Query Records & Latency
  queryRecordsTitle: string;
  queryTotalQueries: string;
  queryAvgLatency: string;
  queryMaxLatency: string;
  querySuccessRate: string;
  queryLatencyChart: string;
  queryLatencyChartDesc: string;
  queryRecordsNodeNotice: string;
  queryRecentRecords: string;
  queryLocalNode: string;
  queryRemoteNode: string;
  querySuccess: string;
  queryFailed: string;
  queryNoRecords: string;
  queryError: string;
  queryA2SData: string;
  queryClickToExpand: string;
  chartTooltipTime: string;
  collapse: string;
  expand: string;
  
  // Add server modal
  addServer: string;
  addServerTitle: string;
  addServerDesc: string;
  addServerWebsite: string;
  addServerConfirm: string;
  
  // Missing i18n for various components
  online: string;
  offline: string;
  serverOfflineTitle: string;
  serverOfflineDescription: string;
  serverOfflineDuration: string;
  serverLastResponse: string;
  secondsAgo: string;
  minutesAgo: string;
  hoursAgo: string;
  minuteUnit: string;
  hourUnit: string;
  dayUnit: string;
  cardSize: string;
  resetCardSize: string;
  showOfflineServers: string;
  clearOfflineServers: string;
  realPlayers: string;
  playerCountCurve: string;
  noPlayerCurveData: string;
  serversCount: string;
  noHistoryData: string;
  bots: string;
}
