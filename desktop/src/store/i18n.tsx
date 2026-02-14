import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Supported languages
export type Language = 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'ko';

export const languageLabels: Record<Language, string> = {
  'en': 'English',
  'ja': '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ko': '한국어',
};

// Detect system language and map to supported language
const detectSystemLanguage = (): Language => {
  const systemLang = navigator.language || navigator.languages?.[0] || 'en';
  const langCode = systemLang.toLowerCase();
  
  if (langCode.startsWith('ja')) {
    return 'ja';
  }
  if (langCode.startsWith('ko')) {
    return 'ko';
  }
  // Traditional Chinese (Taiwan, Hong Kong, Macau)
  if (langCode === 'zh-tw' || langCode === 'zh-hk' || langCode === 'zh-mo' || langCode === 'zh-hant') {
    return 'zh-TW';
  }
  // Simplified Chinese (default for zh)
  if (langCode.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
};

// Translation keys
export interface Translations {
  // App
  appName: string;
  appSubtitle: string;
  
  // Tabs
  tabServers: string;
  tabFavorites: string;
  tabForum: string;
  tabCheckIn: string;
  tabSettings: string;
  
  // Settings page
  settings: string;
  settingsDesc: string;
  generalSettings: string;
  appearance: string;
  colorPalette: string;
  
  // General settings
  apiSettings: string;
  apiServerAddress: string;
  apiServerHint: string;
  autoRefresh: string;
  refreshInterval: string;
  refreshIntervalHint: string;
  autoRefreshEnabled: string;
  dataManagement: string;
  clearData: string;
  clearDataDesc: string;
  clearDataBtn: string;
  saveSettings: string;
  saved: string;
  
  // Language settings
  languageSettings: string;
  languageLabel: string;
  languageAuto: string;
  
  // Auto refresh options
  refreshOff: string;
  refreshSeconds: string;
  refreshMinute: string;
  refresh2Minutes: string;
  refresh5Minutes: string;
  refresh10Minutes: string;
  refreshCustom: string;
  refreshCustomSeconds: string;
  refreshCustomHint: string;
  
  // Clear data modal
  confirmClearData: string;
  clearDataWarning: string;
  clearLoginStatus: string;
  clearThemeSettings: string;
  clearFavorites: string;
  clearCacheData: string;
  clearDataIrreversible: string;
  cancel: string;
  confirmClearRestart: string;
  clearing: string;
  
  // Appearance
  darkMode: string;
  darkModeDesc: string;
  glassEffect: string;
  glassEffectDesc: string;
  backgroundImage: string;
  selectImage: string;
  changeImage: string;
  clearBackground: string;
  backgroundOpacity: string;
  resetAppearance: string;
  
  // Colors
  multiRegionPalette: string;
  multiRegionPaletteDesc: string;
  resetAllColors: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerColor: string;
  sidebarColor: string;
  backgroundColor: string;
  textColor: string;
  
  // App info
  appVersion: string;
  basedOn: string;
  
  // Home page
  refreshServerList: string;
  loadingServers: string;
  noServersFound: string;
  noServersHint: string;
  noFavoriteServers: string;
  noFavoriteServersHint: string;
  showAllServers: string;
  
  // Favorites page
  cloudFavorites: string;
  cloudFavoritesDesc: string;
  loginWithSteam: string;
  loginWithGoogle: string;
  loginWithDiscord: string;
  loginWithUpkk: string;
  loginChooseProvider: string;
  syncFavoritesHint: string;
  myFavorites: string;
  welcome: string;
  favorites: string;
  refresh: string;
  loadingFavorites: string;
  loadFailed: string;
  retry: string;
  noFavorites: string;
  noFavoritesHint: string;
  join: string;
  removeFavorite: string;
  confirmRemoveFavorite: string;
  confirmRemoveFavoriteDesc: string;
  addFavoriteTitle: string;
  addFavoriteDesc: string;
  serverNameOptional: string;
  notesOptional: string;
  addToFavorites: string;
  searchFavorites: string;
  filterByGame: string;
  allGames: string;
  notes: string;
  moveUp: string;
  moveDown: string;
  itemsPerPage: string;
  addToCloudPrompt: string;
  addToCloudPromptDesc: string;
  removeFromCloudPrompt: string;
  removeFromCloudPromptDesc: string;
  playerScore: string;
  playerDuration: string;
  authenticatedView: string;
  
  // Forum page
  loginFirst: string;
  loginForAutoLogin: string;
  clickToLogin: string;
  openingForum: string;
  usingWebView2: string;
  openForumFailed: string;
  cannotOpenWebView2: string;
  forumOpened: string;
  loggedInAutoLogin: string;
  notLoggedInGuest: string;
  forumRunsInWindow: string;
  forumMultiTabSupport: string;
  reopenForum: string;
  openInBrowser: string;
  secureConnection: string;
  tauriNotDetected: string;
  openForumFailedMsg: string;
  
  // Check-in page
  dailyCheckIn: string;
  checkInDesc: string;
  checkInNow: string;
  checkingIn: string;
  pleaseLoginFirst: string;
  loggedInAs: string;
  goToForum: string;
  loginForCheckIn: string;
  usingSteamID64: string;
  
  // Server card/list
  players: string;
  ping: string;
  map: string;
  category: string;
  version: string;
  
  // Filters
  allRegions: string;
  asia: string;
  europe: string;
  northAmerica: string;
  southAmerica: string;
  oceania: string;
  searchPlaceholder: string;
  allCategories: string;
  showFavoritesOnly: string;
  searchLocalFavorites: string;
  addLocalServer: string;
  addLocalServerDesc: string;
  addLocalServerSuccess: string;
  addLocalServerDuplicate: string;
  invalidAddressFormat: string;
  exportFavorites: string;
  importFavorites: string;
  exportFavoritesSuccess: string;
  importFavoritesSuccess: string;
  importFavoritesError: string;
  
  // Game type filter
  gameAll: string;
  gameCs2: string;
  gameCsgo: string;
  
  // Pagination
  perPage: string;
  page: string;
  
  // View modes
  cardView: string;
  listView: string;
  
  // User status
  login: string;
  logout: string;
  loginToSync: string;
  
  // Steam client
  useSteamChina: string;
  steamProtocol: string;
  steamChinaProtocol: string;
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
  serverDetails: string;
  serverAddress: string;
  joinServer: string;
  copyAddress: string;
  addressCopied: string;
  playerHistory: string;
  mapHistory: string;
  recentMaps: string;
  
  // Stats bar
  totalServers: string;
  totalPlayers: string;
  onlineRate: string;
  
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
  serverDetailMorePlayers: string;
  serverDetailNotes: string;
  serverDetailMinutes: string;
  // Query Records & Latency
  queryRecordsTitle: string;
  queryTotalQueries: string;
  queryAvgLatency: string;
  queryMaxLatency: string;
  querySuccessRate: string;
  queryLatencyChart: string;
  queryLatencyChartDesc: string;
  queryRecentRecords: string;
  queryLocalNode: string;
  queryRemoteNode: string;
  querySuccess: string;
  queryFailed: string;
  queryNoRecords: string;
  queryError: string;
  queryA2SData: string;
  queryClickToExpand: string;
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
  showOfflineServers: string;
  clearOfflineServers: string;
  realPlayers: string;
  playerCountCurve: string;
  noPlayerCurveData: string;
  serversCount: string;
  noHistoryData: string;
  bots: string;
  
  // Time periods
  period6h: string;
  period12h: string;
  period24h: string;
  period7d: string;
  period30d: string;
  
  // Card color for palette
  cardColor: string;
  
  // Region filter
  regionAll: string;
  regionChina: string;
  regionInternational: string;
  
  // Server detail modal extended
  currentStatus: string;
  serverRunning: string;
  runtime: string;
  hoursUnit: string;
  minutesUnit: string;
  loadMapHistory: string;
  loadMapHistoryFailed: string;
  prevPage: string;
  nextPage: string;
  
  // Update modal
  updateAvailable: string;
  updateNewVersion: string;
  updateCurrentVersion: string;
  updateLatestVersion: string;
  updateReleaseDate: string;
  updateChangelog: string;
  updateMandatory: string;
  updateLater: string;
  updateDownloadNow: string;
  updateDownloading: string;
  updateNoDownloadUrl: string;
  updateDownloadFailed: string;
  
  // Manual update check
  checkForUpdates: string;
  checkingForUpdates: string;
  noUpdatesAvailable: string;
  updateCheckFailed: string;
  
  // Data directory settings
  dataDirectory: string;
  dataDirectoryDesc: string;
  selectDirectory: string;
  currentDirectory: string;
  resetToDefault: string;
  directoryNotSet: string;
  
  // Loading
  loadingData: string;
  
  // Monitor page
  tabMonitor: string;
  monitorTitle: string;
  monitorDesc: string;
  monitorControl: string;
  monitorStart: string;
  monitorStop: string;
  monitorRunning: string;
  monitorChecks: string;
  monitorMatches: string;
  monitorLastCheck: string;
  monitorNextCheck: string;
  monitorInterval: string;
  monitorSeconds: string;
  monitorMinute: string;
  monitorMinutes: string;
  monitorHour: string;
  monitorRules: string;
  monitorAddRule: string;
  monitorNoRules: string;
  monitorNoRulesDesc: string;
  monitorNewRule: string;
  monitorEditRule: string;
  monitorDeleteRule: string;
  monitorSaveRule: string;
  monitorRuleName: string;
  monitorRuleNamePlaceholder: string;
  monitorServerScope: string;
  monitorAllFavorites: string;
  monitorSelectedServers: string;
  monitorServers: string;
  monitorPatterns: string;
  monitorMapPatterns: string;
  monitorMapPatternsHint: string;
  monitorMapPatternPlaceholder: string;
  monitorAdd: string;
  monitorMinPlayers: string;
  monitorCooldown: string;
  monitorRequiredMatches: string;
  monitorRequiredMatchesHint: string;
  monitorMatchTimes: string;
  monitorMatchImmediate: string;
  monitorNotifyChannels: string;
  monitorDesktopNotify: string;
  monitorDesktopNotifyDesc: string;
  monitorDiscordNotify: string;
  monitorDiscordNotifyDesc: string;
  monitorDiscordHelp: string;
  monitorServerChanNotify: string;
  monitorServerChanNotifyDesc: string;
  monitorServerChanHelp: string;
  monitorCustomWebhookNotify: string;
  monitorCustomWebhookNotifyDesc: string;
  monitorCustomWebhookHelp: string;
  monitorCustomWebhookFieldsTitle: string;
  monitorCustomMessageTemplate: string;
  monitorCustomMessageTemplateDesc: string;
  monitorMessagePreview: string;
  monitorPlaceholder_servername: string;
  monitorPlaceholder_mapname: string;
  monitorPlaceholder_players: string;
  monitorPlaceholder_maxplayers: string;
  monitorPlaceholder_address: string;
  monitorPlaceholder_rulename: string;
  monitorPlaceholder_pattern: string;
  monitorPlaceholder_time: string;
  monitorTest: string;
  monitorTestWebhook: string;
  monitorTestSuccess: string;
  monitorTestFailed: string;
  monitorTesting: string;
  monitorRecentMatches: string;
  monitorActiveMatches: string;
  monitorJoinServer: string;
  monitorAutoJoin: string;
  monitorAutoJoinDesc: string;
  monitorAutoJoinWarning: string;
  monitorLoginRequired: string;
  monitorLoginRequiredDesc: string;
  monitorLoginSuggested: string;
  monitorLoginSuggestedDesc: string;
  monitorMapPatternAddReminder: string;
  monitorAlertTitle: string;
  monitorAlertTitleDesc: string;
  monitorAlertTitlePlaceholder: string;
  monitorSelectFromFavorites: string;
  monitorLocalFavorites: string;
  monitorLoadingFavorites: string;
  monitorNoFavoritesAvailable: string;
  monitorSelectedCount: string;
  monitorSearchServers: string;
  monitorMonitoredServers: string;
  monitorRemoveServer: string;
  monitorNoActiveMatches: string;
  monitorStartPrompt: string;
  monitorRestartPrompt: string;
  monitorStartPromptDesc: string;
  monitorLater: string;
  monitorRestart: string;
  // A2S test settings
  a2sTest: string;
  a2sTestDesc: string;
  a2sTestPlaceholder: string;
  a2sTestQuery: string;
  a2sTestQuerying: string;
  a2sTestResult: string;
  a2sTestError: string;
  a2sTestNotAvailable: string;
  a2sServerName: string;
  a2sMap: string;
  a2sPlayers: string;
  a2sGame: string;
  a2sServerType: string;
  a2sEnvironment: string;
  a2sVac: string;
  a2sPassword: string;
  a2sVersion: string;
  a2sYes: string;
  a2sNo: string;
  // Notification sound settings
  notificationSound: string;
  notificationSoundEnabled: string;
  notificationSoundEnabledDesc: string;
  notificationSoundType: string;
  soundType_chime: string;
  soundType_bubble: string;
  soundType_bell: string;
}

// English translations
const en: Translations = {
  appName: 'Upkk Server Browser',
  appSubtitle: 'Game Server Browser',
  
  tabServers: 'Servers',
  tabFavorites: 'Cloud Favorites',
  tabForum: 'Forum',
  tabCheckIn: 'Check-in',
  tabSettings: 'Settings',
  
  settings: 'Settings',
  settingsDesc: 'Configure application options and appearance',
  generalSettings: 'General',
  appearance: 'Appearance',
  colorPalette: 'Colors',
  
  apiSettings: 'API Settings',
  apiServerAddress: 'API Server Address',
  apiServerHint: 'Enter server API address, e.g.: https://servers.upkk.com',
  autoRefresh: 'Auto Refresh',
  refreshInterval: 'Refresh Interval',
  refreshIntervalHint: 'Set the auto-refresh interval for server list',
  autoRefreshEnabled: 'Auto refresh enabled, refreshing every',
  dataManagement: 'Data Management',
  clearData: 'Clear App Data',
  clearDataDesc: 'Clear all locally stored data, including login status, theme settings, favorites and cache. App will restart after clearing.',
  clearDataBtn: 'Clear Data',
  saveSettings: 'Save Settings',
  saved: '✓ Saved',
  
  languageSettings: 'Language',
  languageLabel: 'Display Language',
  languageAuto: 'Auto (System)',
  
  refreshOff: 'Off',
  refreshSeconds: '30 seconds',
  refreshMinute: '1 minute',
  refresh2Minutes: '2 minutes',
  refresh5Minutes: '5 minutes',
  refresh10Minutes: '10 minutes',
  refreshCustom: 'Custom',
  refreshCustomSeconds: 'seconds',
  refreshCustomHint: 'Enter an integer, minimum 10 seconds',
  
  confirmClearData: 'Confirm Clear Data',
  clearDataWarning: 'Are you sure you want to clear all app data? This will:',
  clearLoginStatus: 'Clear login status and user info',
  clearThemeSettings: 'Clear theme and appearance settings',
  clearFavorites: 'Clear favorites and personal settings',
  clearCacheData: 'Clear local cache data',
  clearDataIrreversible: '⚠️ This action cannot be undone. App will restart automatically.',
  cancel: 'Cancel',
  confirmClearRestart: 'Clear and Restart',
  clearing: 'Clearing...',
  
  darkMode: 'Dark Mode',
  darkModeDesc: 'Switch between light and dark theme',
  glassEffect: 'Glass Effect',
  glassEffectDesc: 'Enable translucent blur effect',
  backgroundImage: 'Background Image',
  selectImage: 'Select Image',
  changeImage: 'Change Image',
  clearBackground: 'Clear',
  backgroundOpacity: 'Background Opacity',
  resetAppearance: 'Reset All Appearance Settings',
  
  multiRegionPalette: 'Multi-Region Palette',
  multiRegionPaletteDesc: 'Customize colors for each UI region with RGBA support',
  resetAllColors: 'Reset All Colors',
  primaryColor: 'Primary',
  secondaryColor: 'Secondary',
  accentColor: 'Accent',
  headerColor: 'Header',
  sidebarColor: 'Card Background',
  backgroundColor: 'Page Background',
  textColor: 'Text Color',
  
  appVersion: 'Upkk Server Browser Desktop v1.0.0',
  basedOn: 'Based on Tauri + React + WebView2',
  
  refreshServerList: 'Refresh server list',
  loadingServers: 'Loading servers...',
  noServersFound: 'No servers found',
  noServersHint: 'Check API connection or try different search criteria',
  noFavoriteServers: 'No favorite servers',
  noFavoriteServersHint: 'Click the star icon on server cards to add favorites',
  showAllServers: 'Show All Servers',
  
  cloudFavorites: 'Cloud Favorites',
  cloudFavoritesDesc: 'Log in to sync your favorites to the cloud and access them from any device.',
  loginWithSteam: 'Login with Steam',
  loginWithGoogle: 'Login with Google',
  loginWithDiscord: 'Login with Discord',
  loginWithUpkk: '[China] Login with Upkk Forum',
  loginChooseProvider: 'Choose a login method',
  syncFavoritesHint: 'Sync favorites between web and desktop versions after login',
  myFavorites: 'My Favorites',
  welcome: 'Welcome',
  favorites: 'favorites',
  refresh: 'Refresh',
  loadingFavorites: 'Loading favorites...',
  loadFailed: 'Load failed',
  retry: 'Retry',
  noFavorites: 'No Favorites',
  noFavoritesHint: 'Click the ⭐ button in server list to add favorites',
  join: 'Join',
  removeFavorite: 'Remove from favorites',
  confirmRemoveFavorite: 'Remove Favorite?',
  confirmRemoveFavoriteDesc: 'Are you sure you want to remove this server from your favorites?',
  addFavoriteTitle: 'Add Favorite Server',
  addFavoriteDesc: 'Enter server IP address and port to add to favorites',
  serverNameOptional: 'Server Name (optional)',
  notesOptional: 'Notes (optional)',
  addToFavorites: 'Add to Favorites',
  searchFavorites: 'Search favorites...',
  filterByGame: 'Filter by game',
  allGames: 'All Games',
  notes: 'Notes',
  moveUp: 'Move up',
  moveDown: 'Move down',
  itemsPerPage: 'Per page',
  addToCloudPrompt: 'Add to Cloud Favorites?',
  addToCloudPromptDesc: 'Also save this server to your cloud favorites for cross-device access?',
  removeFromCloudPrompt: 'Remove from Cloud Favorites?',
  removeFromCloudPromptDesc: 'Also remove this server from your cloud favorites?',
  playerScore: 'Score',
  playerDuration: 'Play Time',
  authenticatedView: 'Authenticated - showing full player names',
  loginFirst: 'Please Login First',
  loginForAutoLogin: 'Login to auto-login to forum',
  clickToLogin: 'Click to Login',
  openingForum: 'Opening forum...',
  usingWebView2: 'Using native WebView2 browser',
  openForumFailed: 'Failed to Open Forum',
  cannotOpenWebView2: 'Cannot open WebView2 window',
  forumOpened: 'Forum Opened',
  loggedInAutoLogin: 'Logged in: {username} (auto-login to forum)',
  notLoggedInGuest: 'Not logged in, forum will be accessed as guest',
  forumRunsInWindow: 'Forum runs in a separate window with full browsing features.',
  forumMultiTabSupport: 'Multi-tab browsing supported! Click links to open in new tabs.',
  reopenForum: 'Reopen Forum Window',
  openInBrowser: 'Open in System Browser',
  secureConnection: 'Secure connection',
  tauriNotDetected: 'Tauri environment not detected. Please run in desktop app.',
  openForumFailedMsg: 'Failed to open forum',
  
  dailyCheckIn: 'Daily Check-in',
  checkInDesc: 'Check in daily to earn forum points',
  checkInNow: 'Check In Now',
  checkingIn: 'Checking in...',
  pleaseLoginFirst: 'Please Login',
  loggedInAs: 'Logged in: {username}',
  goToForum: 'Go to Forum',
  loginForCheckIn: 'Login required for check-in',
  usingSteamID64: 'Secure login via SteamID64',
  
  players: 'Players',
  ping: 'Ping',
  map: 'Map',
  category: 'Category',
  version: 'Version',
  
  allRegions: 'All Regions',
  asia: 'Asia',
  europe: 'Europe',
  northAmerica: 'North America',
  southAmerica: 'South America',
  oceania: 'Oceania',
  searchPlaceholder: 'Search servers...',
  allCategories: 'All Categories',
  showFavoritesOnly: 'Favorites Only',
  searchLocalFavorites: 'Search local favorites...',
  addLocalServer: 'Add Server',
  addLocalServerDesc: 'Enter server IP or domain with port to add to local favorites. Uses local A2S query.',
  addLocalServerSuccess: 'Server added to local favorites',
  addLocalServerDuplicate: 'Server already in local favorites',
  invalidAddressFormat: 'Invalid address format. Use IP:Port or domain:port (e.g. 192.168.1.1:27015)',
  exportFavorites: 'Export',
  importFavorites: 'Import',
  exportFavoritesSuccess: 'Local favorites exported to: ',
  importFavoritesSuccess: 'Favorites imported successfully',
  importFavoritesError: 'Failed to import favorites',
  
  // Game type filter
  gameAll: 'All Games',
  gameCs2: 'CS2',
  gameCsgo: 'CSGO',
  
  perPage: 'Per Page',
  page: 'Page',
  
  cardView: 'Card View',
  listView: 'List View',
  
  login: 'Login',
  logout: 'Logout',
  loginToSync: 'Login to sync',
  
  useSteamChina: 'Use Steam China',
  steamProtocol: 'steam://',
  steamChinaProtocol: 'steamchina://',
  steamClientSetting: 'Steam Client',
  steamClientSettingDesc: 'Choose which Steam client to use for joining servers',
  steamInternational: 'Steam',
  steamChina: 'Steam China',
  steamSwitchConfirmTitle: 'Confirm Steam Client Switch',
  steamSwitchToChina: 'Are you sure you want to switch to Steam China?',
  steamSwitchToChinaWarning: '⚠️ Only enable this if you use the Steam China client',
  steamSwitchToInternational: 'Are you sure you want to switch to Steam (International)?',
  steamSwitchedToInternational: '✅ Switched to Steam (International)',
  steamSwitchedToChina: '⚠️ Switched to Steam China — Only enable this if you use the Steam China client',
  steamConfirm: 'Confirm',
  steamCancel: 'Cancel',
  steamHeaderTooltipInternational: 'Steam (International) — Click to switch to Steam China',
  steamHeaderTooltipChina: 'Steam China — Click to switch to Steam (International)',
  
  serverDetails: 'Server Details',
  serverAddress: 'Server Address',
  joinServer: 'Join Server',
  copyAddress: 'Copy Address',
  addressCopied: 'Address Copied!',
  playerHistory: 'Player History',
  mapHistory: 'Map History',
  recentMaps: 'Recent Maps',
  
  totalServers: 'Servers',
  totalPlayers: 'Players',
  onlineRate: 'Online Rate',
  
  // Auto-join
  autoJoinTitle: 'Auto-Join Server',
  autoJoinStart: 'Start Monitoring',
  autoJoinStop: 'Stop Monitoring',
  autoJoinMonitoring: 'Monitoring server...',
  autoJoinChecking: 'Checking server status...',
  autoJoinWaiting: 'Waiting for slots',
  autoJoinDetected: 'Slots detected!',
  autoJoinCheckFailed: 'Check failed',
  autoJoinMinSlots: 'Minimum slots required',
  autoJoinSlots: 'slots',
  autoJoinTrigger: 'Trigger condition',
  autoJoinTriggerDesc: 'When online players ≤',
  autoJoinCurrentPlayers: 'Current',
  autoJoinRemaining: 'remaining',
  autoJoinNextCheck: 'Next check',
  autoJoinSeconds: 's',
  autoJoinButton: 'Auto-Join',
  autoJoinCheckInterval: 'Check interval',

  // Multi-server (data consolidation)
  multiServerSelect: 'Multi-Server',
  multiServerTitle: 'Select Server',
  multiServerJoin: 'Join',
  
  // Server detail modal
  serverDetailMap: 'Map',
  serverDetailPlayers: 'Online Players',
  serverDetailGame: 'Game',
  serverDetailCategory: 'Category',
  serverDetailCountry: 'Country/Region',
  serverDetailVersion: 'Version',
  serverDetailLoad: 'Server Load',
  serverDetailVac: 'VAC Protected',
  serverDetailPassword: 'Password Required',
  serverDetailMapHistory: 'Map History',
  serverDetailOnlinePlayers: 'Online Players',
  serverDetailLoading: 'Loading...',
  serverDetailNoPlayers: 'Unable to get player list',
  serverDetailLoginToView: 'Login to view full player info',
  serverDetailMorePlayers: 'more players not shown',
  serverDetailNotes: 'Notes',
  serverDetailMinutes: 'min',
  queryRecordsTitle: 'Query Records & Latency',
  queryTotalQueries: 'Total Queries',
  queryAvgLatency: 'Avg Latency',
  queryMaxLatency: 'Max Latency',
  querySuccessRate: 'Success Rate',
  queryLatencyChart: 'Query Latency Trend (24h)',
  queryLatencyChartDesc: 'This is the latency from our server querying the game server, not your actual latency',
  queryRecentRecords: 'Recent Query Records',
  queryLocalNode: 'Local',
  queryRemoteNode: 'Remote',
  querySuccess: 'Success',
  queryFailed: 'Failed',
  queryNoRecords: 'No query records yet (records are generated automatically during A2S queries, TTL 7200s)',
  queryError: 'Error',
  queryA2SData: 'A2S Data',
  queryClickToExpand: 'click to expand',
  collapse: 'Collapse',
  expand: 'Expand',
  
  // Add server modal
  addServer: 'Add Server',
  addServerTitle: 'Add Server',
  addServerDesc: 'Adding a server requires logging in on the website. Click confirm to open the website in your browser.',
  addServerWebsite: 'servers.upkk.com',
  addServerConfirm: 'Open Website',
  
  // Missing i18n for various components
  online: 'Online',
  offline: 'Offline',
  showOfflineServers: 'Show Offline',
  clearOfflineServers: 'Clean Offline',
  realPlayers: 'Real Players',
  playerCountCurve: 'Player Count Curve',
  noPlayerCurveData: 'No player curve data',
  serversCount: 'servers',
  noHistoryData: 'No history data',
  bots: 'Bots',
  
  // Time periods
  period6h: '6 Hours',
  period12h: '12 Hours',
  period24h: '24 Hours',
  period7d: '7 Days',
  period30d: '30 Days',
  
  // Card color for palette
  cardColor: 'Card Color',
  
  // Region filter
  regionAll: 'All',
  regionChina: 'China',
  regionInternational: 'International',
  
  // Server detail modal extended
  currentStatus: 'Current',
  serverRunning: 'Running',
  runtime: 'Runtime',
  hoursUnit: 'hours',
  minutesUnit: 'minutes',
  loadMapHistory: 'Load Map History',
  loadMapHistoryFailed: 'Failed to load map history',
  prevPage: 'Previous',
  nextPage: 'Next',
  
  // Update modal
  updateAvailable: 'Update Available',
  updateNewVersion: 'A new version is available!',
  updateCurrentVersion: 'Current Version',
  updateLatestVersion: 'Latest Version',
  updateReleaseDate: 'Release Date',
  updateChangelog: 'What\'s New',
  updateMandatory: 'This update is required. Please update to continue using the application.',
  updateLater: 'Later',
  updateDownloadNow: 'Download Now',
  updateDownloading: 'Opening...',
  updateNoDownloadUrl: 'Download URL not available',
  updateDownloadFailed: 'Failed to open download link',
  
  // Manual update check
  checkForUpdates: 'Check for Updates',
  checkingForUpdates: 'Checking for updates...',
  noUpdatesAvailable: 'You are using the latest version',
  updateCheckFailed: 'Failed to check for updates',
  
  // Data directory settings
  dataDirectory: 'Data Directory',
  dataDirectoryDesc: 'Choose where to save application data and settings',
  selectDirectory: 'Select Directory',
  currentDirectory: 'Current Directory',
  resetToDefault: 'Reset to Default',
  directoryNotSet: 'Using default location',
  
  // Loading
  loadingData: 'Loading...',
  
  // Monitor page
  tabMonitor: 'Map Monitor',
  monitorTitle: 'Map Monitor',
  monitorDesc: 'Automatically monitor your cloud-favorite servers for map changes. Get notified via Desktop, Discord, or ServerChan. You can also use the custom webhook to integrate with your own QQ bot or forward to QQ groups',
  monitorControl: 'Monitor Control',
  monitorStart: 'Start Monitor',
  monitorStop: 'Stop Monitor',
  monitorRunning: 'Monitoring in progress...',
  monitorChecks: 'Total Checks',
  monitorMatches: 'Matches',
  monitorLastCheck: 'Last Check',
  monitorNextCheck: 'Next Check',
  monitorInterval: 'Check Interval',
  monitorSeconds: 'seconds',
  monitorMinute: 'minute',
  monitorMinutes: 'minutes',
  monitorHour: 'hour',
  monitorRules: 'Monitor Rules',
  monitorAddRule: 'Add Rule',
  monitorNoRules: 'No monitor rules yet',
  monitorNoRulesDesc: 'Create a rule to start monitoring your favorite servers for specific maps',
  monitorNewRule: 'New Rule',
  monitorEditRule: 'Edit Rule',
  monitorDeleteRule: 'Delete Rule',
  monitorSaveRule: 'Save Rule',
  monitorRuleName: 'Rule Name',
  monitorRuleNamePlaceholder: 'e.g. ZE Map Alert',
  monitorServerScope: 'Server Scope',
  monitorAllFavorites: 'All Favorites',
  monitorSelectedServers: 'Selected Servers',
  monitorServers: 'servers',
  monitorPatterns: 'patterns',
  monitorMapPatterns: 'Map Name Patterns',
  monitorMapPatternsHint: 'Use * as wildcard. e.g. ze_* matches all ZE maps, *dust* matches maps containing "dust"',
  monitorMapPatternPlaceholder: 'e.g. ze_*, *dust*, de_mirage',
  monitorAdd: 'Add',
  monitorMinPlayers: 'Minimum Players',
  monitorCooldown: 'Notification Cooldown',
  monitorRequiredMatches: 'Required Consecutive Matches',
  monitorRequiredMatchesHint: 'Map must be detected this many consecutive checks before notifying, to prevent false alerts from transient map changes',
  monitorMatchTimes: 'times',
  monitorMatchImmediate: 'notify immediately',
  monitorNotifyChannels: 'Notification Channels',
  monitorDesktopNotify: 'Desktop Notification',
  monitorDesktopNotifyDesc: 'Show Windows desktop notification when matched',
  monitorDiscordNotify: 'Discord Webhook',
  monitorDiscordNotifyDesc: 'Send alert to Discord channel via webhook',
  monitorDiscordHelp: 'Open Discord → Go to your channel → Click the gear icon (Edit Channel) → Integrations → Webhooks → New Webhook → Copy Webhook URL and paste it here.',
  monitorServerChanNotify: 'Server Chan (Server酱)',
  monitorServerChanNotifyDesc: 'Push notifications to WeChat via Server Chan',
  monitorServerChanHelp: 'Visit sct.ftqq.com to get your SendKey. Messages will be pushed to your WeChat via the Server Chan service. Supports WeChat, enterprise WeChat, and custom channels.',
  monitorCustomWebhookNotify: 'Custom Webhook',
  monitorCustomWebhookNotifyDesc: 'Send HTTP POST to a custom URL (for developers)',
  monitorCustomWebhookHelp: 'Enter your custom webhook URL. When a map match is detected, a POST request with JSON data will be sent. Suitable for developers who want to forward notifications to platforms like QQ groups via a bot program.',
  monitorCustomWebhookFieldsTitle: 'View POST JSON fields',
  monitorCustomMessageTemplate: 'Custom Message Template',
  monitorCustomMessageTemplateDesc: 'Customize notification content using placeholders. Leave empty to use the default format. Click a placeholder to append it.',
  monitorMessagePreview: 'Preview:',
  monitorPlaceholder_servername: 'Server name',
  monitorPlaceholder_mapname: 'Map name',
  monitorPlaceholder_players: 'Players',
  monitorPlaceholder_maxplayers: 'Max players',
  monitorPlaceholder_address: 'Address',
  monitorPlaceholder_rulename: 'Rule name',
  monitorPlaceholder_pattern: 'Pattern',
  monitorPlaceholder_time: 'Time',
  monitorTest: 'Test',
  monitorTestWebhook: 'Test Webhook',
  monitorTestSuccess: 'Success',
  monitorTestFailed: 'Failed',
  monitorTesting: 'Testing...',
  monitorRecentMatches: 'Recent Matches',
  monitorActiveMatches: 'Matched Servers',
  monitorJoinServer: 'Join',
  monitorAutoJoin: 'Auto-Join Server',
  monitorAutoJoinDesc: 'Automatically join the first matched server. Monitoring stops after joining.',
  monitorAutoJoinWarning: '⚠️ Enabling this will automatically stop monitoring after joining a server. If you are using this as a notification bot, do NOT enable this option to avoid monitoring being stopped unintentionally.',
  monitorLoginRequired: 'Login Required',
  monitorLoginRequiredDesc: 'Please log in to use the map monitor. It queries your cloud favorites for status updates.',
  monitorLoginSuggested: 'Login Suggested',
  monitorLoginSuggestedDesc: 'Login to sync cloud favorites. You can still use map monitoring with local favorites without logging in.',
  monitorMapPatternAddReminder: '⚠️ Don\'t forget to click the "Add" button after entering a map name pattern!',
  monitorAlertTitle: 'Alert Title',
  monitorAlertTitleDesc: 'Customize the title for Discord/ServerChan notifications. Supports placeholders. Leave empty for default.',
  monitorAlertTitlePlaceholder: '🎮 Server Map Alert',
  monitorSelectFromFavorites: 'Select from cloud favorites',
  monitorLocalFavorites: 'Local Favorites',
  monitorLoadingFavorites: 'Loading favorites...',
  monitorNoFavoritesAvailable: 'No favorites available',
  monitorSelectedCount: 'selected',
  monitorSearchServers: 'Search servers...',
  monitorMonitoredServers: 'Monitored Servers',
  monitorRemoveServer: 'Remove from all rules',
  monitorNoActiveMatches: 'No matched servers yet. Matches will appear here when a monitored server loads a matching map.',
  monitorStartPrompt: 'Start Monitoring?',
  monitorRestartPrompt: 'Restart Monitoring?',
  monitorStartPromptDesc: 'Rule saved successfully. Would you like to start monitoring now?',
  monitorLater: 'Later',
  monitorRestart: 'Restart',
  // A2S test
  a2sTest: 'A2S Server Query',
  a2sTestDesc: 'Test local A2S UDP query to a game server (supports IP and domain name)',
  a2sTestPlaceholder: 'IP or domain, e.g. 1.2.3.4:27015 / example.com:27015',
  a2sTestQuery: 'Query',
  a2sTestQuerying: 'Querying...',
  a2sTestResult: 'Query Result',
  a2sTestError: 'Query failed',
  a2sTestNotAvailable: 'A2S query is only available in the desktop app',
  a2sServerName: 'Server Name',
  a2sMap: 'Map',
  a2sPlayers: 'Players',
  a2sGame: 'Game',
  a2sServerType: 'Server Type',
  a2sEnvironment: 'Environment',
  a2sVac: 'VAC',
  a2sPassword: 'Password',
  a2sVersion: 'Version',
  a2sYes: 'Yes',
  a2sNo: 'No',
  // Notification sound
  notificationSound: 'Notification Sound',
  notificationSoundEnabled: 'Enable Sound',
  notificationSoundEnabledDesc: 'Play a sound when map monitor notifications appear',
  notificationSoundType: 'Sound Style',
  soundType_chime: 'Chime',
  soundType_bubble: 'Bubble',
  soundType_bell: 'Bell',
};

// Japanese translations
const ja: Translations = {
  appName: 'Upkk サーバーブラウザ',
  appSubtitle: 'ゲームサーバーブラウザ',
  
  tabServers: 'サーバー',
  tabFavorites: 'クラウドお気に入り',
  tabForum: 'フォーラム',
  tabCheckIn: 'チェックイン',
  tabSettings: '設定',
  
  settings: '設定',
  settingsDesc: 'アプリケーションのオプションと外観を設定',
  generalSettings: '一般設定',
  appearance: '外観',
  colorPalette: 'カラーパレット',
  
  apiSettings: 'API 設定',
  apiServerAddress: 'API サーバーアドレス',
  apiServerHint: 'サーバーAPIアドレスを入力（例: https://servers.upkk.com）',
  autoRefresh: '自動更新',
  refreshInterval: '更新間隔',
  refreshIntervalHint: 'サーバーリストの自動更新間隔を設定',
  autoRefreshEnabled: '自動更新が有効です。更新間隔:',
  dataManagement: 'データ管理',
  clearData: 'アプリデータを消去',
  clearDataDesc: 'ログイン状態、テーマ設定、お気に入り、キャッシュなど全てのローカルデータを消去します。消去後、アプリは自動的に再起動します。',
  clearDataBtn: 'データを消去',
  saveSettings: '設定を保存',
  saved: '✓ 保存しました',
  
  languageSettings: '言語',
  languageLabel: '表示言語',
  languageAuto: '自動（システム）',
  
  refreshOff: 'オフ',
  refreshSeconds: '30秒',
  refreshMinute: '1分',
  refresh2Minutes: '2分',
  refresh5Minutes: '5分',
  refresh10Minutes: '10分',
  refreshCustom: 'カスタム',
  refreshCustomSeconds: '秒',
  refreshCustomHint: '整数を入力してください、最小10秒',
  
  confirmClearData: 'データ消去の確認',
  clearDataWarning: '本当に全てのアプリデータを消去しますか？以下が消去されます:',
  clearLoginStatus: 'ログイン状態とユーザー情報',
  clearThemeSettings: 'テーマと外観設定',
  clearFavorites: 'お気に入りと個人設定',
  clearCacheData: 'ローカルキャッシュデータ',
  clearDataIrreversible: '⚠️ この操作は取り消せません。アプリは自動的に再起動します。',
  cancel: 'キャンセル',
  confirmClearRestart: '消去して再起動',
  clearing: '消去中...',
  
  darkMode: 'ダークモード',
  darkModeDesc: 'ライト/ダークテーマを切り替え',
  glassEffect: 'ガラス効果',
  glassEffectDesc: '半透明のブラー効果を有効化',
  backgroundImage: '背景画像',
  selectImage: '画像を選択',
  changeImage: '画像を変更',
  clearBackground: 'クリア',
  backgroundOpacity: '背景の不透明度',
  resetAppearance: '全ての外観設定をリセット',
  
  multiRegionPalette: 'マルチリージョンパレット',
  multiRegionPaletteDesc: 'RGBAサポートで各UIリージョンの色をカスタマイズ',
  resetAllColors: '全ての色をリセット',
  primaryColor: 'メインカラー',
  secondaryColor: 'サブカラー',
  accentColor: 'アクセント',
  headerColor: 'ヘッダー',
  sidebarColor: 'カード背景',
  backgroundColor: 'ページ背景',
  textColor: 'テキスト色',
  
  appVersion: 'Upkk Server Browser Desktop v1.0.0',
  basedOn: 'Tauri + React + WebView2 ベース',
  
  refreshServerList: 'サーバーリストを更新',
  loadingServers: 'サーバーを読み込み中...',
  noServersFound: 'サーバーが見つかりません',
  noServersHint: 'API接続を確認するか、別の検索条件を試してください',
  noFavoriteServers: 'お気に入りサーバーがありません',
  noFavoriteServersHint: 'サーバーカードの星アイコンをクリックしてお気に入りに追加',
  showAllServers: '全てのサーバーを表示',
  
  cloudFavorites: 'クラウドお気に入り',
  cloudFavoritesDesc: 'ログインしてお気に入りをクラウドに同期し、どのデバイスからでもアクセスできます。',
  loginWithSteam: 'Steamでログイン',
  loginWithGoogle: 'Googleでログイン',
  loginWithDiscord: 'Discordでログイン',
  loginWithUpkk: '[中国大陸] Upkkフォーラムでログイン',
  loginChooseProvider: 'ログイン方法を選択',
  syncFavoritesHint: 'ログイン後、Web版とデスクトップ版でお気に入りを同期',
  myFavorites: 'マイお気に入り',
  welcome: 'ようこそ',
  favorites: '件のお気に入り',
  refresh: '更新',
  loadingFavorites: 'お気に入りを読み込み中...',
  loadFailed: '読み込み失敗',
  retry: '再試行',
  noFavorites: 'お気に入りなし',
  noFavoritesHint: 'サーバーリストで ⭐ ボタンをクリックして追加',
  join: '参加',
  removeFavorite: 'お気に入りから削除',
  confirmRemoveFavorite: 'お気に入りを削除しますか？',
  confirmRemoveFavoriteDesc: 'このサーバーをお気に入りから削除してもよろしいですか？',
  addFavoriteTitle: 'お気に入りサーバーを追加',
  addFavoriteDesc: 'サーバーのIPアドレスとポートを入力して追加',
  serverNameOptional: 'サーバー名 (任意)',
  notesOptional: 'メモ (任意)',
  addToFavorites: 'お気に入りに追加',
  searchFavorites: 'お気に入りを検索...',
  filterByGame: 'ゲームで絞り込み',
  allGames: 'すべてのゲーム',
  notes: 'メモ',
  moveUp: '上に移動',
  moveDown: '下に移動',
  itemsPerPage: '表示件数',
  addToCloudPrompt: 'クラウドお気に入りに追加しますか？',
  addToCloudPromptDesc: 'このサーバーをクラウドお気に入りにも保存して、他のデバイスからアクセスできるようにしますか？',
  removeFromCloudPrompt: 'クラウドお気に入りから削除しますか？',
  removeFromCloudPromptDesc: 'このサーバーをクラウドお気に入りからも削除しますか？',
  playerScore: 'スコア',
  playerDuration: 'プレイ時間',
  authenticatedView: '認証済み - 完全なプレイヤー名を表示',
  loginFirst: 'まずログインしてください',
  loginForAutoLogin: 'ログインするとフォーラムに自動ログインできます',
  clickToLogin: 'ログイン',
  openingForum: 'フォーラムを開いています...',
  usingWebView2: 'ネイティブWebView2ブラウザを使用',
  openForumFailed: 'フォーラムを開けませんでした',
  cannotOpenWebView2: 'WebView2ウィンドウを開けません',
  forumOpened: 'フォーラムを開きました',
  loggedInAutoLogin: 'ログイン中: {username}（フォーラムに自動ログイン）',
  notLoggedInGuest: '未ログイン、ゲストモードでフォーラムにアクセス',
  forumRunsInWindow: 'フォーラムは完全なブラウジング機能を持つ別ウィンドウで実行されます。',
  forumMultiTabSupport: 'マルチタブブラウジング対応！リンクをクリックすると新しいタブで開きます。',
  reopenForum: 'フォーラムウィンドウを再度開く',
  openInBrowser: 'システムブラウザで開く',
  secureConnection: '安全な接続',
  tauriNotDetected: 'Tauri環境が検出されません。デスクトップアプリで実行してください。',
  openForumFailedMsg: 'フォーラムを開けませんでした',
  
  dailyCheckIn: '毎日チェックイン',
  checkInDesc: '毎日チェックインしてフォーラムポイントを獲得',
  checkInNow: '今すぐチェックイン',
  checkingIn: 'チェックイン中...',
  pleaseLoginFirst: 'ログインしてください',
  loggedInAs: 'ログイン中: {username}',
  goToForum: 'フォーラムへ',
  loginForCheckIn: 'チェックインにはログインが必要です',
  usingSteamID64: 'SteamID64で安全にログイン',
  
  players: 'プレイヤー',
  ping: 'Ping',
  map: 'マップ',
  category: 'カテゴリ',
  version: 'バージョン',
  
  allRegions: '全地域',
  asia: 'アジア',
  europe: 'ヨーロッパ',
  northAmerica: '北米',
  southAmerica: '南米',
  oceania: 'オセアニア',
  searchPlaceholder: 'サーバーを検索...',
  allCategories: '全カテゴリ',
  showFavoritesOnly: 'お気に入りのみ',
  searchLocalFavorites: 'ローカルお気に入りを検索...',
  addLocalServer: 'サーバー追加',
  addLocalServerDesc: 'サーバーのIPまたはドメインとポートを入力してローカルお気に入りに追加。ローカルA2Sクエリを使用。',
  addLocalServerSuccess: 'ローカルお気に入りにサーバーを追加しました',
  addLocalServerDuplicate: 'サーバーはすでにローカルお気に入りにあります',
  invalidAddressFormat: '無効なアドレス形式です。IP:Port またはドメイン:port（例: 192.168.1.1:27015）を使用してください',
  exportFavorites: 'エクスポート',
  importFavorites: 'インポート',
  exportFavoritesSuccess: 'ローカルお気に入りをエクスポートしました: ',
  importFavoritesSuccess: 'お気に入りのインポートに成功しました',
  importFavoritesError: 'お気に入りのインポートに失敗しました',
  
  // Game type filter
  gameAll: '全ゲーム',
  gameCs2: 'CS2',
  gameCsgo: 'CSGO',
  
  perPage: '表示件数',
  page: 'ページ',
  
  cardView: 'カード表示',
  listView: 'リスト表示',
  
  login: 'ログイン',
  logout: 'ログアウト',
  loginToSync: '同期するにはログイン',
  
  useSteamChina: 'Steam中国を使用',
  steamProtocol: 'steam://',
  steamChinaProtocol: 'steamchina://',
  steamClientSetting: 'Steamクライアント',
  steamClientSettingDesc: 'サーバー参加に使用するSteamクライアントを選択',
  steamInternational: 'Steam',
  steamChina: 'Steam中国',
  steamSwitchConfirmTitle: 'Steamクライアント切替の確認',
  steamSwitchToChina: 'Steam中国に切り替えますか？',
  steamSwitchToChinaWarning: '⚠️ Steam中国クライアントを使用している場合のみ有効にしてください',
  steamSwitchToInternational: 'Steam（国際版）に切り替えますか？',
  steamSwitchedToInternational: '✅ Steam（国際版）に切り替えました',
  steamSwitchedToChina: '⚠️ Steam中国に切り替えました — Steam中国クライアントを使用している場合のみ有効にしてください',
  steamConfirm: '確認',
  steamCancel: 'キャンセル',
  steamHeaderTooltipInternational: 'Steam（国際版）— クリックしてSteam中国に切替',
  steamHeaderTooltipChina: 'Steam中国 — クリックしてSteam（国際版）に切替',
  
  serverDetails: 'サーバー詳細',
  serverAddress: 'サーバーアドレス',
  joinServer: 'サーバーに参加',
  copyAddress: 'アドレスをコピー',
  addressCopied: 'コピーしました！',
  playerHistory: 'プレイヤー履歴',
  mapHistory: 'マップ履歴',
  recentMaps: '最近のマップ',
  
  totalServers: 'サーバー',
  totalPlayers: 'プレイヤー',
  onlineRate: 'オンライン率',
  
  // Auto-join
  autoJoinTitle: '自動参加',
  autoJoinStart: '監視開始',
  autoJoinStop: '監視停止',
  autoJoinMonitoring: 'サーバーを監視中...',
  autoJoinChecking: 'サーバー状態を確認中...',
  autoJoinWaiting: '空きを待機中',
  autoJoinDetected: '空きを検出！',
  autoJoinCheckFailed: '確認失敗',
  autoJoinMinSlots: '必要な最小空き',
  autoJoinSlots: 'スロット',
  autoJoinTrigger: 'トリガー条件',
  autoJoinTriggerDesc: 'オンラインプレイヤーが以下の場合',
  autoJoinCurrentPlayers: '現在',
  autoJoinRemaining: '残り',
  autoJoinNextCheck: '次の確認',
  autoJoinSeconds: '秒',
  autoJoinButton: '自動参加',
  autoJoinCheckInterval: '確認間隔',

  // Multi-server (data consolidation)
  multiServerSelect: 'マルチサーバー',
  multiServerTitle: 'サーバー選択',
  multiServerJoin: '参加',
  
  // Server detail modal
  serverDetailMap: 'マップ',
  serverDetailPlayers: 'オンラインプレイヤー',
  serverDetailGame: 'ゲーム',
  serverDetailCategory: 'カテゴリ',
  serverDetailCountry: '国/地域',
  serverDetailVersion: 'バージョン',
  serverDetailLoad: 'サーバー負荷',
  serverDetailVac: 'VAC保護',
  serverDetailPassword: 'パスワード必須',
  serverDetailMapHistory: 'マップ変更履歴',
  serverDetailOnlinePlayers: 'オンラインプレイヤー',
  serverDetailLoading: '読み込み中...',
  serverDetailNoPlayers: 'プレイヤーリストを取得できません',
  serverDetailLoginToView: 'ログインして完全なプレイヤー情報を表示',
  serverDetailMorePlayers: '人のプレイヤーが表示されていません',
  serverDetailNotes: '備考',
  serverDetailMinutes: '分',
  queryRecordsTitle: 'クエリ記録と遅延',
  queryTotalQueries: '総クエリ数',
  queryAvgLatency: '平均遅延',
  queryMaxLatency: '最大遅延',
  querySuccessRate: '成功率',
  queryLatencyChart: 'クエリ遅延トレンド（24時間）',
  queryLatencyChartDesc: 'これは本サイトがゲームサーバーを照会した応答時間であり、実際の遅延ではありません',
  queryRecentRecords: '最近のクエリ記録',
  queryLocalNode: 'ローカル',
  queryRemoteNode: 'リモート',
  querySuccess: '成功',
  queryFailed: '失敗',
  queryNoRecords: 'クエリ記録がまだありません（A2Sクエリ時に自動生成、TTL 7200秒）',
  queryError: 'エラー',
  queryA2SData: 'A2Sデータ',
  queryClickToExpand: 'クリックで展開',
  collapse: '折りたたむ',
  expand: '展開',
  
  // Add server modal
  addServer: 'サーバー追加',
  addServerTitle: 'サーバー追加',
  addServerDesc: 'サーバーの追加にはウェブサイトでのログインが必要です。確認をクリックするとブラウザでウェブサイトを開きます。',
  addServerWebsite: 'servers.upkk.com',
  addServerConfirm: 'ウェブサイトを開く',
  
  // Missing i18n for various components
  online: 'オンライン',
  offline: 'オフライン',
  showOfflineServers: 'オフラインを表示',
  clearOfflineServers: 'オフラインを削除',
  realPlayers: '実プレイヤー',
  playerCountCurve: 'プレイヤー数曲線',
  noPlayerCurveData: 'プレイヤー曲線データなし',
  serversCount: 'サーバー',
  noHistoryData: '履歴データなし',
  bots: 'ボット',
  
  // Time periods
  period6h: '6時間',
  period12h: '12時間',
  period24h: '24時間',
  period7d: '7日',
  period30d: '30日',
  
  // Card color for palette
  cardColor: 'カードカラー',
  
  // Region filter
  regionAll: 'すべて',
  regionChina: '中国',
  regionInternational: '海外',
  
  // Server detail modal extended
  currentStatus: '現在',
  serverRunning: '稼働中',
  runtime: '稼働時間',
  hoursUnit: '時間',
  minutesUnit: '分',
  loadMapHistory: 'マップ履歴を読み込む',
  loadMapHistoryFailed: 'マップ履歴の読み込みに失敗しました',
  prevPage: '前へ',
  nextPage: '次へ',
  
  // Update modal
  updateAvailable: 'アップデートがあります',
  updateNewVersion: '新しいバージョンが利用可能です！',
  updateCurrentVersion: '現在のバージョン',
  updateLatestVersion: '最新バージョン',
  updateReleaseDate: 'リリース日',
  updateChangelog: '更新内容',
  updateMandatory: 'このアップデートは必須です。続行するには更新してください。',
  updateLater: '後で',
  updateDownloadNow: '今すぐダウンロード',
  updateDownloading: '開いています...',
  updateNoDownloadUrl: 'ダウンロードURLがありません',
  updateDownloadFailed: 'ダウンロードリンクを開けませんでした',
  
  // Manual update check
  checkForUpdates: 'アップデートを確認',
  checkingForUpdates: 'アップデートを確認中...',
  noUpdatesAvailable: '最新バージョンを使用しています',
  updateCheckFailed: 'アップデートの確認に失敗しました',
  
  // Data directory settings
  dataDirectory: 'データ保存先',
  dataDirectoryDesc: 'アプリデータと設定の保存場所を選択',
  selectDirectory: 'フォルダを選択',
  currentDirectory: '現在のフォルダ',
  resetToDefault: 'デフォルトに戻す',
  directoryNotSet: 'デフォルトの場所を使用',
  
  // Loading
  loadingData: '読み込み中...',
  
  // Monitor page
  tabMonitor: 'マップモニター',
  monitorTitle: 'マップモニター',
  monitorDesc: 'お気に入りサーバーの特定マップを自動監視して通知を受け取る。カスタムWebhookで独自のボットと連携も可能',
  monitorControl: 'モニター制御',
  monitorStart: '監視開始',
  monitorStop: '監視停止',
  monitorRunning: '監視中...',
  monitorChecks: 'チェック回数',
  monitorMatches: 'マッチ数',
  monitorLastCheck: '最終チェック',
  monitorNextCheck: '次回チェック',
  monitorInterval: 'チェック間隔',
  monitorSeconds: '秒',
  monitorMinute: '分',
  monitorMinutes: '分',
  monitorHour: '時間',
  monitorRules: '監視ルール',
  monitorAddRule: 'ルール追加',
  monitorNoRules: '監視ルールがありません',
  monitorNoRulesDesc: 'ルールを作成して、お気に入りサーバーの特定マップを監視しましょう',
  monitorNewRule: '新規ルール',
  monitorEditRule: 'ルール編集',
  monitorDeleteRule: 'ルール削除',
  monitorSaveRule: '保存',
  monitorRuleName: 'ルール名',
  monitorRuleNamePlaceholder: '例: ZEマップアラート',
  monitorServerScope: 'サーバー範囲',
  monitorAllFavorites: '全てのお気に入り',
  monitorSelectedServers: '選択したサーバー',
  monitorServers: 'サーバー',
  monitorPatterns: 'パターン',
  monitorMapPatterns: 'マップ名パターン',
  monitorMapPatternsHint: '* をワイルドカードとして使用。例: ze_* は全てのZEマップ、*dust* は "dust" を含むマップ',
  monitorMapPatternPlaceholder: '例: ze_*, *dust*, de_mirage',
  monitorAdd: '追加',
  monitorMinPlayers: '最小プレイヤー数',
  monitorCooldown: '通知クールダウン',
  monitorRequiredMatches: '必要連続検出回数',
  monitorRequiredMatchesHint: '通知前にマップがこの回数連続で検出される必要があります。一時的なマップ変更による誤報を防ぎます',
  monitorMatchTimes: '回',
  monitorMatchImmediate: '即時通知',
  monitorNotifyChannels: '通知チャンネル',
  monitorDesktopNotify: 'デスクトップ通知',
  monitorDesktopNotifyDesc: 'マッチ時にWindowsデスクトップ通知を表示',
  monitorDiscordNotify: 'Discord Webhook',
  monitorDiscordNotifyDesc: 'WebhookでDiscordチャンネルにアラートを送信',
  monitorDiscordHelp: 'Discordを開く → チャンネルに移動 → 歯車アイコン（チャンネルの編集）をクリック → 連携サービス → ウェブフック → 新しいウェブフック → ウェブフックURLをコピーしてここに貼り付けてください。',
  monitorServerChanNotify: 'Server Chan（Server酱）',
  monitorServerChanNotifyDesc: 'Server Chan経由でWeChatに通知をプッシュ',
  monitorServerChanHelp: 'sct.ftqq.comでSendKeyを取得してください。Server Chanサービスを通じてWeChatにメッセージがプッシュされます。WeChat、企業WeChat、カスタムチャンネルに対応。',
  monitorCustomWebhookNotify: 'カスタムWebhook',
  monitorCustomWebhookNotifyDesc: 'カスタムURLにHTTP POSTを送信（開発者向け）',
  monitorCustomWebhookHelp: 'カスタムWebhook URLを入力してください。マップが一致した場合、JSONデータを含むPOSTリクエストが送信されます。BOTプログラムを通じてQQグループなどに通知を転送したい開発者向けです。',
  monitorCustomWebhookFieldsTitle: 'POST JSONフィールドを表示',
  monitorCustomMessageTemplate: 'カスタムメッセージテンプレート',
  monitorCustomMessageTemplateDesc: 'プレースホルダーを使用して通知内容をカスタマイズできます。空欄の場合はデフォルト形式が使用されます。プレースホルダーをクリックして追加できます。',
  monitorMessagePreview: 'プレビュー：',
  monitorPlaceholder_servername: 'サーバー名',
  monitorPlaceholder_mapname: 'マップ名',
  monitorPlaceholder_players: 'プレイヤー数',
  monitorPlaceholder_maxplayers: '最大プレイヤー数',
  monitorPlaceholder_address: 'アドレス',
  monitorPlaceholder_rulename: 'ルール名',
  monitorPlaceholder_pattern: 'パターン',
  monitorPlaceholder_time: '時刻',
  monitorTest: 'テスト',
  monitorTestWebhook: 'Webhookテスト',
  monitorTestSuccess: '成功',
  monitorTestFailed: '失敗',
  monitorTesting: 'テスト中...',
  monitorRecentMatches: '最近のマッチ',
  monitorActiveMatches: 'マッチしたサーバー',
  monitorJoinServer: '参加',
  monitorAutoJoin: 'サーバー自動参加',
  monitorAutoJoinDesc: '最初にマッチしたサーバーに自動的に参加します。参加後、監視は停止します。',
  monitorAutoJoinWarning: '⚠️ この機能を有効にすると、サーバーに参加後に監視が自動的に停止します。通知ボットとして使用する場合は、監視が意図せず停止するのを防ぐためにこのオプションを有効にしないでください。',
  monitorLoginRequired: 'ログインが必要です',
  monitorLoginRequiredDesc: 'マップモニターを使用するにはログインしてください。クラウドお気に入りのステータスを照会します。',
  monitorLoginSuggested: 'ログイン推奨',
  monitorLoginSuggestedDesc: 'クラウドお気に入りを同期するにはログインしてください。ログインしなくてもローカルお気に入りで地図監視を使用できます。',
  monitorMapPatternAddReminder: '⚠️ マップ名パターンを入力した後、「追加」ボタンをクリックするのを忘れないでください！',
  monitorAlertTitle: 'アラートタイトル',
  monitorAlertTitleDesc: 'Discord/ServerChan通知のタイトルをカスタマイズします。プレースホルダーをサポートします。空欄の場合はデフォルトが使用されます。',
  monitorAlertTitlePlaceholder: '🎮 Server Map Alert',
  monitorSelectFromFavorites: 'クラウドお気に入りから選択',
  monitorLocalFavorites: 'ローカルお気に入り',
  monitorLoadingFavorites: 'お気に入りを読み込み中...',
  monitorNoFavoritesAvailable: 'お気に入りがありません',
  monitorSelectedCount: '件選択',
  monitorSearchServers: 'サーバーを検索...',
  monitorMonitoredServers: '監視中のサーバー',
  monitorRemoveServer: '全てのルールから削除',
  monitorNoActiveMatches: 'まだマッチしたサーバーはありません。監視中のサーバーが一致するマップをロードすると、ここに表示されます。',
  monitorStartPrompt: '監視を開始しますか？',
  monitorRestartPrompt: '監視を再開しますか？',
  monitorStartPromptDesc: 'ルールが保存されました。今すぐ監視を開始しますか？',
  monitorLater: '後で',
  monitorRestart: '再開',
  // A2S test
  a2sTest: 'A2S サーバークエリ',
  a2sTestDesc: 'ゲームサーバーへのローカルA2S UDPクエリをテスト（IPとドメイン名対応）',
  a2sTestPlaceholder: 'IPまたはドメイン 例: 1.2.3.4:27015 / example.com:27015',
  a2sTestQuery: 'クエリ',
  a2sTestQuerying: 'クエリ中...',
  a2sTestResult: 'クエリ結果',
  a2sTestError: 'クエリ失敗',
  a2sTestNotAvailable: 'A2Sクエリはデスクトップアプリでのみ利用可能です',
  a2sServerName: 'サーバー名',
  a2sMap: 'マップ',
  a2sPlayers: 'プレイヤー',
  a2sGame: 'ゲーム',
  a2sServerType: 'サーバータイプ',
  a2sEnvironment: '環境',
  a2sVac: 'VAC',
  a2sPassword: 'パスワード',
  a2sVersion: 'バージョン',
  a2sYes: 'はい',
  a2sNo: 'いいえ',
  // Notification sound
  notificationSound: '通知音',
  notificationSoundEnabled: 'サウンドを有効にする',
  notificationSoundEnabledDesc: 'マップモニター通知時にサウンドを再生',
  notificationSoundType: 'サウンドスタイル',
  soundType_chime: 'チャイム',
  soundType_bubble: 'バブル',
  soundType_bell: 'ベル',
};

// Simplified Chinese translations
const zhCN: Translations = {
  appName: 'Upkk Server Browser',
  appSubtitle: '游戏服务器浏览器',
  
  tabServers: '服务器',
  tabFavorites: '云端收藏',
  tabForum: '论坛',
  tabCheckIn: '签到',
  tabSettings: '设置',
  
  settings: '设置',
  settingsDesc: '配置应用程序选项和外观',
  generalSettings: '通用设置',
  appearance: '外观',
  colorPalette: '调色板',
  
  apiSettings: 'API 设置',
  apiServerAddress: 'API 服务器地址',
  apiServerHint: '输入服务器API地址，例如: https://servers.upkk.com',
  autoRefresh: '自动刷新',
  refreshInterval: '刷新间隔',
  refreshIntervalHint: '设置服务器列表自动刷新的时间间隔',
  autoRefreshEnabled: '自动刷新已启用，每',
  dataManagement: '数据管理',
  clearData: '清空程序数据',
  clearDataDesc: '清除所有本地存储的数据，包括登录状态、主题设置、收藏列表和网页缓存等。清除后程序将自动重启。',
  clearDataBtn: '清空数据',
  saveSettings: '保存设置',
  saved: '✓ 已保存',
  
  languageSettings: '语言',
  languageLabel: '显示语言',
  languageAuto: '自动（跟随系统）',
  
  refreshOff: '关闭',
  refreshSeconds: '30 秒',
  refreshMinute: '1 分钟',
  refresh2Minutes: '2 分钟',
  refresh5Minutes: '5 分钟',
  refresh10Minutes: '10 分钟',
  refreshCustom: '自定义',
  refreshCustomSeconds: '秒',
  refreshCustomHint: '请输入整数，最低10秒',
  
  confirmClearData: '确认清空数据',
  clearDataWarning: '您确定要清空所有程序数据吗？此操作将：',
  clearLoginStatus: '清除登录状态和用户信息',
  clearThemeSettings: '清除主题和外观设置',
  clearFavorites: '清除收藏列表和个性化设置',
  clearCacheData: '清除本地缓存数据',
  clearDataIrreversible: '⚠️ 此操作不可撤销，程序将自动重启',
  cancel: '取消',
  confirmClearRestart: '确认清空并重启',
  clearing: '正在清除...',
  
  darkMode: '暗色模式',
  darkModeDesc: '切换明暗主题',
  glassEffect: '毛玻璃效果',
  glassEffectDesc: '启用半透明模糊效果',
  backgroundImage: '背景图片',
  selectImage: '选择图片',
  changeImage: '更换图片',
  clearBackground: '清除',
  backgroundOpacity: '背景透明度',
  resetAppearance: '重置所有外观设置',
  
  multiRegionPalette: '多区域调色板',
  multiRegionPaletteDesc: '支持 RGBA 调色，自由设置每个区域的颜色',
  resetAllColors: '重置所有颜色',
  primaryColor: '主色调',
  secondaryColor: '辅助色',
  accentColor: '强调色',
  headerColor: '顶部栏',
  sidebarColor: '卡片背景',
  backgroundColor: '页面背景',
  textColor: '文字颜色',
  
  appVersion: 'Upkk Server Browser Desktop v1.0.0',
  basedOn: '基于 Tauri + React + WebView2',
  
  refreshServerList: '刷新服务器列表',
  loadingServers: '正在加载服务器...',
  noServersFound: '没有找到服务器',
  noServersHint: '请检查API连接或尝试其他搜索条件',
  noFavoriteServers: '没有收藏的服务器',
  noFavoriteServersHint: '点击服务器卡片上的星号来添加收藏',
  showAllServers: '显示所有服务器',
  
  cloudFavorites: '云端收藏',
  cloudFavoritesDesc: '登录后可以将服务器收藏同步到云端，在任何设备上访问您的收藏列表。',
  loginWithSteam: '使用 Steam 登录',
  loginWithGoogle: '使用 Google 登录',
  loginWithDiscord: '使用 Discord 登录',
  loginWithUpkk: '[中国大陆网络] 使用 Upkk 论坛账号登录',
  loginChooseProvider: '选择登录方式',
  syncFavoritesHint: '登录后您可以在网页版和桌面版之间同步收藏',
  myFavorites: '我的收藏',
  welcome: '欢迎',
  favorites: '个收藏',
  refresh: '刷新',
  loadingFavorites: '正在加载收藏列表...',
  loadFailed: '加载收藏失败',
  retry: '重试',
  noFavorites: '暂无收藏',
  noFavoritesHint: '在服务器列表中点击 ⭐ 按钮添加收藏',
  join: '加入',
  removeFavorite: '移除收藏',
  confirmRemoveFavorite: '确定移除收藏？',
  confirmRemoveFavoriteDesc: '确定要将此服务器从收藏中移除吗？',
  addFavoriteTitle: '添加收藏服务器',
  addFavoriteDesc: '输入服务器IP地址和端口以添加到收藏',
  serverNameOptional: '服务器名称 (可选)',
  notesOptional: '备注 (可选)',
  addToFavorites: '添加到收藏',
  searchFavorites: '搜索收藏...',
  filterByGame: '按游戏筛选',
  allGames: '全部游戏',
  notes: '备注',
  moveUp: '上移',
  moveDown: '下移',
  itemsPerPage: '每页',
  addToCloudPrompt: '是否添加到云端收藏？',
  addToCloudPromptDesc: '是否同时将此服务器保存到云端收藏，以便在其他设备上访问？',
  removeFromCloudPrompt: '是否从云端收藏移除？',
  removeFromCloudPromptDesc: '是否同时从云端收藏中移除此服务器？',
  playerScore: '得分',
  playerDuration: '游玩时长',
  authenticatedView: '已验证身份 - 显示完整玩家名称',
  loginFirst: '请先登录账号',
  loginForAutoLogin: '登录后可自动登录论坛',
  clickToLogin: '点击登录',
  openingForum: '正在打开论坛...',
  usingWebView2: '使用原生 WebView2 浏览器',
  openForumFailed: '打开论坛失败',
  cannotOpenWebView2: '无法打开 WebView2 窗口',
  forumOpened: '论坛已打开',
  loggedInAutoLogin: '已登录: {username} (自动登录论坛)',
  notLoggedInGuest: '未登录，论坛将以游客模式访问',
  forumRunsInWindow: '论坛在独立窗口中运行，支持完整的浏览功能。',
  forumMultiTabSupport: '支持多标签页浏览！点击链接可在新标签页中打开。',
  reopenForum: '重新打开论坛窗口',
  openInBrowser: '在系统浏览器中打开',
  secureConnection: '安全连接',
  tauriNotDetected: '未检测到 Tauri 环境。请确保在桌面应用中运行。',
  openForumFailedMsg: '打开论坛失败',
  
  dailyCheckIn: '每日签到',
  checkInDesc: '坚持签到，获取论坛积分奖励',
  checkInNow: '立即签到',
  checkingIn: '签到中...',
  pleaseLoginFirst: '请先登录',
  loggedInAs: '已登录: {username}',
  goToForum: '前往论坛',
  loginForCheckIn: '签到需要先登录账号',
  usingSteamID64: '使用 SteamID64 安全登录',
  
  players: '玩家',
  ping: '延迟',
  map: '地图',
  category: '分类',
  version: '版本',
  
  allRegions: '全部地区',
  asia: '亚洲',
  europe: '欧洲',
  northAmerica: '北美',
  southAmerica: '南美',
  oceania: '大洋洲',
  searchPlaceholder: '搜索服务器...',
  allCategories: '全部分类',
  showFavoritesOnly: '只看收藏',
  searchLocalFavorites: '搜索本地收藏...',
  addLocalServer: '添加服务器',
  addLocalServerDesc: '输入服务器IP或域名及端口，添加到本地收藏。使用本地A2S查询。',
  addLocalServerSuccess: '服务器已添加到本地收藏',
  addLocalServerDuplicate: '服务器已在本地收藏中',
  invalidAddressFormat: '无效的地址格式。请使用 IP:端口 或 域名:端口（例如 192.168.1.1:27015）',
  exportFavorites: '导出',
  importFavorites: '导入',
  exportFavoritesSuccess: '本地收藏文件已导出到: ',
  importFavoritesSuccess: '收藏导入成功',
  importFavoritesError: '收藏导入失败',
  
  // Game type filter
  gameAll: '全部游戏',
  gameCs2: 'CS2',
  gameCsgo: 'CSGO',
  
  perPage: '每页显示',
  page: '页',
  
  cardView: '卡片视图',
  listView: '列表视图',
  
  login: '登录',
  logout: '退出登录',
  loginToSync: '登录以同步',
  
  useSteamChina: '使用蒸汽平台',
  steamProtocol: 'steam://',
  steamChinaProtocol: 'steamchina://',
  steamClientSetting: 'Steam 客户端',
  steamClientSettingDesc: '选择加入服务器时使用的 Steam 客户端',
  steamInternational: 'Steam 国际版',
  steamChina: '蒸汽中国',
  steamSwitchConfirmTitle: '确认切换 Steam 客户端',
  steamSwitchToChina: '您确定要切换到蒸汽中国吗？',
  steamSwitchToChinaWarning: '⚠️ 只有使用蒸汽中国客户端才需要启用此选项',
  steamSwitchToInternational: '您确定要切换到 Steam 国际版吗？',
  steamSwitchedToInternational: '✅ 已切换到 Steam 国际版',
  steamSwitchedToChina: '⚠️ 已切换到蒸汽中国 - 只有使用蒸汽中国客户端才需要启用此选项',
  steamConfirm: '确认切换',
  steamCancel: '取消',
  steamHeaderTooltipInternational: 'Steam 国际版 (点击切换到蒸汽中国)',
  steamHeaderTooltipChina: '蒸汽中国 (点击切换到 Steam 国际版)',

  serverDetails: '服务器详情',
  serverAddress: '服务器地址',
  joinServer: '加入服务器',
  copyAddress: '复制地址',
  addressCopied: '地址已复制！',
  playerHistory: '玩家历史',
  mapHistory: '地图历史',
  recentMaps: '最近地图',
  
  totalServers: '服务器',
  totalPlayers: '玩家',
  onlineRate: '在线率',
  
  // Auto-join
  autoJoinTitle: '自动加入服务器',
  autoJoinStart: '开始监控',
  autoJoinStop: '停止监控',
  autoJoinMonitoring: '正在监控服务器...',
  autoJoinChecking: '正在检查服务器状态...',
  autoJoinWaiting: '等待空位',
  autoJoinDetected: '检测到空位！',
  autoJoinCheckFailed: '检查失败',
  autoJoinMinSlots: '最少空位要求',
  autoJoinSlots: '个空位',
  autoJoinTrigger: '触发条件',
  autoJoinTriggerDesc: '当在线玩家 ≤',
  autoJoinCurrentPlayers: '当前人数',
  autoJoinRemaining: '剩余',
  autoJoinNextCheck: '下次检查',
  autoJoinSeconds: '秒',
  autoJoinButton: '自动加入',
  autoJoinCheckInterval: '检测间隔',

  // Multi-server (data consolidation)
  multiServerSelect: '多服可选',
  multiServerTitle: '选择服务器',
  multiServerJoin: '加入',
  
  // Server detail modal
  serverDetailMap: '地图',
  serverDetailPlayers: '在线玩家',
  serverDetailGame: '游戏',
  serverDetailCategory: '分类',
  serverDetailCountry: '国家/地区',
  serverDetailVersion: '版本',
  serverDetailLoad: '服务器负载',
  serverDetailVac: 'VAC 保护',
  serverDetailPassword: '需要密码',
  serverDetailMapHistory: '地图变更历史',
  serverDetailOnlinePlayers: '在线玩家',
  serverDetailLoading: '加载中...',
  serverDetailNoPlayers: '无法获取玩家列表',
  serverDetailLoginToView: '登录后可查看完整玩家信息',
  serverDetailMorePlayers: '名玩家未显示',
  serverDetailNotes: '备注',
  serverDetailMinutes: '分钟',
  queryRecordsTitle: '查询记录与延迟',
  queryTotalQueries: '总查询次数',
  queryAvgLatency: '平均延迟',
  queryMaxLatency: '最大延迟',
  querySuccessRate: '成功率',
  queryLatencyChart: '查询延迟趋势（24小时）',
  queryLatencyChartDesc: '此延迟为本站查询服务器的响应时间，不代表您的实际延迟',
  queryRecentRecords: '最近查询记录',
  queryLocalNode: '本地查询',
  queryRemoteNode: '远程节点',
  querySuccess: '成功',
  queryFailed: '失败',
  queryNoRecords: '暂无查询记录（记录会在A2S查询时自动生成，TTL 7200秒）',
  queryError: '错误',
  queryA2SData: 'A2S 数据',
  queryClickToExpand: '点击展开',
  collapse: '收起',
  expand: '展开',
  
  // Add server modal
  addServer: '添加服务器',
  addServerTitle: '添加服务器',
  addServerDesc: '添加服务器需要到网页登录进行。点击确认后将在浏览器中打开网站。',
  addServerWebsite: 'servers.upkk.com',
  addServerConfirm: '打开网站',
  
  // Missing i18n for various components
  online: '在线',
  offline: '离线',
  showOfflineServers: '显示离线',
  clearOfflineServers: '清理离线',
  realPlayers: '真实玩家',
  playerCountCurve: '玩家人数曲线',
  noPlayerCurveData: '暂无玩家曲线数据',
  serversCount: '个服务器',
  noHistoryData: '暂无历史数据',
  bots: '机器人',
  
  // Time periods
  period6h: '6小时',
  period12h: '12小时',
  period24h: '24小时',
  period7d: '7天',
  period30d: '30天',
  
  // Card color for palette
  cardColor: '卡片颜色',
  
  // Region filter
  regionAll: '全部',
  regionChina: '中国',
  regionInternational: '国际',
  
  // Server detail modal extended
  currentStatus: '当前',
  serverRunning: '运行中',
  runtime: '运行时长',
  hoursUnit: '小时',
  minutesUnit: '分钟',
  loadMapHistory: '加载地图历史',
  loadMapHistoryFailed: '获取地图历史失败',
  prevPage: '上一页',
  nextPage: '下一页',
  
  // Update modal
  updateAvailable: '发现新版本',
  updateNewVersion: '新版本已发布！',
  updateCurrentVersion: '当前版本',
  updateLatestVersion: '最新版本',
  updateReleaseDate: '发布日期',
  updateChangelog: '更新内容',
  updateMandatory: '这是必须更新的版本，请更新后继续使用应用程序。',
  updateLater: '稍后提醒',
  updateDownloadNow: '立即下载',
  updateDownloading: '正在打开...',
  updateNoDownloadUrl: '下载地址不可用',
  updateDownloadFailed: '无法打开下载链接',
  
  // Manual update check
  checkForUpdates: '检查更新',
  checkingForUpdates: '正在检查更新...',
  noUpdatesAvailable: '当前已是最新版本',
  updateCheckFailed: '检查更新失败',
  
  // Data directory settings
  dataDirectory: '数据保存目录',
  dataDirectoryDesc: '选择应用程序数据和设置的保存位置',
  selectDirectory: '选择目录',
  currentDirectory: '当前目录',
  resetToDefault: '恢复默认',
  directoryNotSet: '使用默认位置',
  
  // Loading
  loadingData: '加载中...',
  
  // Monitor page
  tabMonitor: '地图监控',
  monitorTitle: '地图监控',
  monitorDesc: '自动监控云端收藏的服务器地图变化，匹配指定地图时推送通知到桌面、Discord 或 Server酱。您还可利用此功能的自定义 Webhook 对接自己的 QQ 机器人，转发到 QQ 群等',
  monitorControl: '监控控制',
  monitorStart: '启动监控',
  monitorStop: '停止监控',
  monitorRunning: '正在监控中...',
  monitorChecks: '检查次数',
  monitorMatches: '匹配次数',
  monitorLastCheck: '上次检查',
  monitorNextCheck: '下次检查',
  monitorInterval: '检查间隔',
  monitorSeconds: '秒',
  monitorMinute: '分钟',
  monitorMinutes: '分钟',
  monitorHour: '小时',
  monitorRules: '监控规则',
  monitorAddRule: '添加规则',
  monitorNoRules: '暂无监控规则',
  monitorNoRulesDesc: '创建规则来监控你收藏的服务器，当特定地图出现时自动通知',
  monitorNewRule: '新建规则',
  monitorEditRule: '编辑规则',
  monitorDeleteRule: '删除规则',
  monitorSaveRule: '保存规则',
  monitorRuleName: '规则名称',
  monitorRuleNamePlaceholder: '例如：ZE 地图提醒',
  monitorServerScope: '服务器范围',
  monitorAllFavorites: '所有收藏',
  monitorSelectedServers: '指定服务器',
  monitorServers: '个服务器',
  monitorPatterns: '个匹配',
  monitorMapPatterns: '地图名称匹配',
  monitorMapPatternsHint: '使用 * 作为通配符。例如 ze_* 匹配所有 ZE 地图，*dust* 匹配包含 "dust" 的地图',
  monitorMapPatternPlaceholder: '例如：ze_*、*dust*、de_mirage',
  monitorAdd: '添加',
  monitorMinPlayers: '最低在线人数',
  monitorCooldown: '通知冷却时间',
  monitorRequiredMatches: '连续检测确认次数',
  monitorRequiredMatchesHint: '地图必须被连续检测到指定次数后才触发通知，防止因瞬间地图变化产生误报',
  monitorMatchTimes: '次',
  monitorMatchImmediate: '立即通知',
  monitorNotifyChannels: '通知方式',
  monitorDesktopNotify: '桌面通知',
  monitorDesktopNotifyDesc: '匹配到地图时弹出 Windows 桌面通知',
  monitorDiscordNotify: 'Discord Webhook',
  monitorDiscordNotifyDesc: '通过 Webhook 发送提醒到 Discord 频道',
  monitorDiscordHelp: '打开 Discord → 进入你的频道 → 点击齿轮图标（编辑频道）→ 集成 → Webhooks → 新建 Webhook → 复制 Webhook URL 粘贴到这里。',
  monitorServerChanNotify: 'Server酱',
  monitorServerChanNotifyDesc: '通过 Server酱 推送通知到微信',
  monitorServerChanHelp: '前往 sct.ftqq.com 登录并获取 SendKey。消息将通过 Server酱 推送到你的微信。支持微信、企业微信及自定义通道推送。',
  monitorCustomWebhookNotify: '自定义 Webhook',
  monitorCustomWebhookNotifyDesc: '通过 HTTP POST 发送到自定义网址（适合有开发能力的用户）',
  monitorCustomWebhookHelp: '输入你的自定义 Webhook 网址。匹配到地图时会向该网址发送包含 JSON 数据的 POST 请求。适合有开发能力的用户，例如通过 BOT 程序将通知转发到 QQ 群等平台。',
  monitorCustomWebhookFieldsTitle: '查看 POST JSON 字段说明',
  monitorCustomMessageTemplate: '自定义消息模板',
  monitorCustomMessageTemplateDesc: '使用占位符自定义通知内容，留空则使用默认格式。点击占位符可快速添加。',
  monitorMessagePreview: '预览：',
  monitorPlaceholder_servername: '服务器名',
  monitorPlaceholder_mapname: '地图名',
  monitorPlaceholder_players: '当前人数',
  monitorPlaceholder_maxplayers: '最大人数',
  monitorPlaceholder_address: '地址',
  monitorPlaceholder_rulename: '规则名',
  monitorPlaceholder_pattern: '匹配模式',
  monitorPlaceholder_time: '通知时间',
  monitorTest: '测试',
  monitorTestWebhook: '测试 Webhook',
  monitorTestSuccess: '发送成功',
  monitorTestFailed: '发送失败',
  monitorTesting: '测试中...',
  monitorRecentMatches: '最近匹配记录',
  monitorActiveMatches: '匹配服务器',
  monitorJoinServer: '加入',
  monitorAutoJoin: '自动加入服务器',
  monitorAutoJoinDesc: '匹配时自动加入第一个匹配的服务器，加入后监控自动停止。',
  monitorAutoJoinWarning: '⚠️ 开启此选项后，加入服务器命令发出后将自动关闭监控。如果您是作为通知 Bot 来使用，请不要开启此选项，以免监控被自动停止。',
  monitorLoginRequired: '需要登录',
  monitorLoginRequiredDesc: '请先登录以使用地图监控功能，该功能通过查询云端收藏来获取服务器状态。',
  monitorLoginSuggested: '建议登录',
  monitorLoginSuggestedDesc: '登录后可同步云端收藏。未登录也可使用本地收藏进行地图监控。',
  monitorMapPatternAddReminder: '⚠️ 输入地图名称后，不要忘记点击「添加」按钮！',
  monitorAlertTitle: '通知标题',
  monitorAlertTitleDesc: '自定义 Discord/Server酱 通知的标题，支持占位符。留空则使用默认标题。',
  monitorAlertTitlePlaceholder: '🎮 Server Map Alert',
  monitorSelectFromFavorites: '从云端收藏中选择',
  monitorLocalFavorites: '本地收藏',
  monitorLoadingFavorites: '加载收藏列表中...',
  monitorNoFavoritesAvailable: '暂无收藏服务器',
  monitorSelectedCount: '已选择',
  monitorSearchServers: '搜索服务器...',
  monitorMonitoredServers: '监控中的服务器',
  monitorRemoveServer: '从所有规则中移除',
  monitorNoActiveMatches: '暂无匹配的服务器。当监控的服务器加载匹配的地图时，将在此显示。',
  monitorStartPrompt: '开始监控？',
  monitorRestartPrompt: '重新开始监控？',
  monitorStartPromptDesc: '规则已保存。是否立即开始监控？',
  monitorLater: '稍后',
  monitorRestart: '重新开始',
  // A2S test
  a2sTest: 'A2S 服务器查询',
  a2sTestDesc: '测试本地 A2S UDP 查询游戏服务器（支持IP和域名）',
  a2sTestPlaceholder: 'IP或域名，例如 1.2.3.4:27015 / example.com:27015',
  a2sTestQuery: '查询',
  a2sTestQuerying: '查询中...',
  a2sTestResult: '查询结果',
  a2sTestError: '查询失败',
  a2sTestNotAvailable: 'A2S 查询仅在桌面客户端可用',
  a2sServerName: '服务器名称',
  a2sMap: '地图',
  a2sPlayers: '玩家',
  a2sGame: '游戏',
  a2sServerType: '服务器类型',
  a2sEnvironment: '运行环境',
  a2sVac: 'VAC',
  a2sPassword: '密码保护',
  a2sVersion: '版本',
  a2sYes: '是',
  a2sNo: '否',
  // Notification sound
  notificationSound: '通知提示音',
  notificationSoundEnabled: '启用提示音',
  notificationSoundEnabledDesc: '地图监控通知时播放提示音',
  notificationSoundType: '提示音风格',
  soundType_chime: '铃声',
  soundType_bubble: '气泡',
  soundType_bell: '钟声',
};

// Traditional Chinese translations
const zhTW: Translations = {
  appName: 'Upkk Server Browser',
  appSubtitle: '遊戲伺服器瀏覽器',
  
  tabServers: '伺服器',
  tabFavorites: '雲端收藏',
  tabForum: '論壇',
  tabCheckIn: '簽到',
  tabSettings: '設定',
  
  settings: '設定',
  settingsDesc: '設定應用程式選項和外觀',
  generalSettings: '一般設定',
  appearance: '外觀',
  colorPalette: '調色盤',
  
  apiSettings: 'API 設定',
  apiServerAddress: 'API 伺服器地址',
  apiServerHint: '輸入伺服器API地址，例如: https://servers.upkk.com',
  autoRefresh: '自動更新',
  refreshInterval: '更新間隔',
  refreshIntervalHint: '設定伺服器列表自動更新的時間間隔',
  autoRefreshEnabled: '自動更新已啟用，每',
  dataManagement: '資料管理',
  clearData: '清除程式資料',
  clearDataDesc: '清除所有本地儲存的資料，包括登入狀態、主題設定、收藏列表和網頁快取等。清除後程式將自動重啟。',
  clearDataBtn: '清除資料',
  saveSettings: '儲存設定',
  saved: '✓ 已儲存',
  
  languageSettings: '語言',
  languageLabel: '顯示語言',
  languageAuto: '自動（跟隨系統）',
  
  refreshOff: '關閉',
  refreshSeconds: '30 秒',
  refreshMinute: '1 分鐘',
  refresh2Minutes: '2 分鐘',
  refresh5Minutes: '5 分鐘',
  refresh10Minutes: '10 分鐘',
  refreshCustom: '自訂',
  refreshCustomSeconds: '秒',
  refreshCustomHint: '請輸入整數，最低10秒',
  
  confirmClearData: '確認清除資料',
  clearDataWarning: '您確定要清除所有程式資料嗎？此操作將：',
  clearLoginStatus: '清除登入狀態和使用者資訊',
  clearThemeSettings: '清除主題和外觀設定',
  clearFavorites: '清除收藏列表和個人化設定',
  clearCacheData: '清除本地快取資料',
  clearDataIrreversible: '⚠️ 此操作無法撤銷，程式將自動重啟',
  cancel: '取消',
  confirmClearRestart: '確認清除並重啟',
  clearing: '正在清除...',
  
  darkMode: '深色模式',
  darkModeDesc: '切換明暗主題',
  glassEffect: '毛玻璃效果',
  glassEffectDesc: '啟用半透明模糊效果',
  backgroundImage: '背景圖片',
  selectImage: '選擇圖片',
  changeImage: '更換圖片',
  clearBackground: '清除',
  backgroundOpacity: '背景透明度',
  resetAppearance: '重設所有外觀設定',
  
  multiRegionPalette: '多區域調色盤',
  multiRegionPaletteDesc: '支援 RGBA 調色，自由設定每個區域的顏色',
  resetAllColors: '重設所有顏色',
  primaryColor: '主色調',
  secondaryColor: '輔助色',
  accentColor: '強調色',
  headerColor: '頂部列',
  sidebarColor: '卡片背景',
  backgroundColor: '頁面背景',
  textColor: '文字顏色',
  
  appVersion: 'Upkk Server Browser Desktop v1.0.0',
  basedOn: '基於 Tauri + React + WebView2',
  
  refreshServerList: '更新伺服器列表',
  loadingServers: '正在載入伺服器...',
  noServersFound: '沒有找到伺服器',
  noServersHint: '請檢查API連線或嘗試其他搜尋條件',
  noFavoriteServers: '沒有收藏的伺服器',
  noFavoriteServersHint: '點擊伺服器卡片上的星號來新增收藏',
  showAllServers: '顯示所有伺服器',
  
  cloudFavorites: '雲端收藏',
  cloudFavoritesDesc: '登入後可以將伺服器收藏同步到雲端，在任何裝置上存取您的收藏列表。',
  loginWithSteam: '使用 Steam 登入',
  loginWithGoogle: '使用 Google 登入',
  loginWithDiscord: '使用 Discord 登入',
  loginWithUpkk: '[大陸用戶] 使用 Upkk 論壇帳號登入',
  loginChooseProvider: '選擇登入方式',
  syncFavoritesHint: '登入後您可以在網頁版和桌面版之間同步收藏',
  myFavorites: '我的收藏',
  welcome: '歡迎',
  favorites: '個收藏',
  refresh: '更新',
  loadingFavorites: '正在載入收藏列表...',
  loadFailed: '載入收藏失敗',
  retry: '重試',
  noFavorites: '暫無收藏',
  noFavoritesHint: '在伺服器列表中點擊 ⭐ 按鈕新增收藏',
  join: '加入',
  removeFavorite: '移除收藏',
  confirmRemoveFavorite: '確定移除收藏？',
  confirmRemoveFavoriteDesc: '確定要將此伺服器從收藏中移除嗎？',
  addFavoriteTitle: '新增收藏伺服器',
  addFavoriteDesc: '輸入伺服器IP位址和連接埠以新增到收藏',
  serverNameOptional: '伺服器名稱 (選填)',
  notesOptional: '備註 (選填)',
  addToFavorites: '新增到收藏',
  searchFavorites: '搜尋收藏...',
  filterByGame: '依遊戲篩選',
  allGames: '全部遊戲',
  notes: '備註',
  moveUp: '上移',
  moveDown: '下移',
  itemsPerPage: '每頁',
  addToCloudPrompt: '是否新增到雲端收藏？',
  addToCloudPromptDesc: '是否同時將此伺服器儲存到雲端收藏，以便在其他裝置上存取？',
  removeFromCloudPrompt: '是否從雲端收藏移除？',
  removeFromCloudPromptDesc: '是否同時從雲端收藏中移除此伺服器？',
  playerScore: '得分',
  playerDuration: '遊玩時長',
  authenticatedView: '已驗證身份 - 顯示完整玩家名稱',
  loginFirst: '請先登入帳號',
  loginForAutoLogin: '登入後可自動登入論壇',
  clickToLogin: '點擊登入',
  openingForum: '正在開啟論壇...',
  usingWebView2: '使用原生 WebView2 瀏覽器',
  openForumFailed: '開啟論壇失敗',
  cannotOpenWebView2: '無法開啟 WebView2 視窗',
  forumOpened: '論壇已開啟',
  loggedInAutoLogin: '已登入: {username} (自動登入論壇)',
  notLoggedInGuest: '未登入，論壇將以訪客模式存取',
  forumRunsInWindow: '論壇在獨立視窗中執行，支援完整的瀏覽功能。',
  forumMultiTabSupport: '支援多標籤頁瀏覽！點擊連結可在新標籤頁中開啟。',
  reopenForum: '重新開啟論壇視窗',
  openInBrowser: '在系統瀏覽器中開啟',
  secureConnection: '安全連線',
  tauriNotDetected: '未偵測到 Tauri 環境。請確保在桌面應用中執行。',
  openForumFailedMsg: '開啟論壇失敗',
  
  dailyCheckIn: '每日簽到',
  checkInDesc: '堅持簽到，獲取論壇積分獎勵',
  checkInNow: '立即簽到',
  checkingIn: '簽到中...',
  pleaseLoginFirst: '請先登入',
  loggedInAs: '已登入: {username}',
  goToForum: '前往論壇',
  loginForCheckIn: '簽到需要先登入帳號',
  usingSteamID64: '使用 SteamID64 安全登入',
  
  players: '玩家',
  ping: '延遲',
  map: '地圖',
  category: '分類',
  version: '版本',
  
  allRegions: '全部地區',
  asia: '亞洲',
  europe: '歐洲',
  northAmerica: '北美',
  southAmerica: '南美',
  oceania: '大洋洲',
  searchPlaceholder: '搜尋伺服器...',
  allCategories: '全部分類',
  showFavoritesOnly: '只看收藏',
  searchLocalFavorites: '搜尋本地收藏...',
  addLocalServer: '新增伺服器',
  addLocalServerDesc: '輸入伺服器IP或域名及連接埠，新增到本地收藏。使用本地A2S查詢。',
  addLocalServerSuccess: '伺服器已新增到本地收藏',
  addLocalServerDuplicate: '伺服器已在本地收藏中',
  invalidAddressFormat: '無效的地址格式。請使用 IP:連接埠 或 域名:連接埠（例如 192.168.1.1:27015）',
  exportFavorites: '匯出',
  importFavorites: '匯入',
  exportFavoritesSuccess: '本地收藏檔案已匯出到: ',
  importFavoritesSuccess: '收藏匯入成功',
  importFavoritesError: '收藏匯入失敗',
  
  // Game type filter
  gameAll: '全部遊戲',
  gameCs2: 'CS2',
  gameCsgo: 'CSGO',
  
  perPage: '每頁顯示',
  page: '頁',
  
  cardView: '卡片檢視',
  listView: '列表檢視',
  
  login: '登入',
  logout: '登出',
  loginToSync: '登入以同步',
  
  useSteamChina: '使用蒸汽平台',
  steamProtocol: 'steam://',
  steamChinaProtocol: 'steamchina://',
  steamClientSetting: 'Steam 用戶端',
  steamClientSettingDesc: '選擇加入伺服器時使用的 Steam 用戶端',
  steamInternational: 'Steam 國際版',
  steamChina: '蒸汽中國',
  steamSwitchConfirmTitle: '確認切換 Steam 用戶端',
  steamSwitchToChina: '您確定要切換到蒸汽中國嗎？',
  steamSwitchToChinaWarning: '⚠️ 只有使用蒸汽中國用戶端才需要啟用此選項',
  steamSwitchToInternational: '您確定要切換到 Steam 國際版嗎？',
  steamSwitchedToInternational: '✅ 已切換到 Steam 國際版',
  steamSwitchedToChina: '⚠️ 已切換到蒸汽中國 - 只有使用蒸汽中國用戶端才需要啟用此選項',
  steamConfirm: '確認切換',
  steamCancel: '取消',
  steamHeaderTooltipInternational: 'Steam 國際版 (點擊切換到蒸汽中國)',
  steamHeaderTooltipChina: '蒸汽中國 (點擊切換到 Steam 國際版)',
  
  serverDetails: '伺服器詳情',
  serverAddress: '伺服器地址',
  joinServer: '加入伺服器',
  copyAddress: '複製地址',
  addressCopied: '地址已複製！',
  playerHistory: '玩家歷史',
  mapHistory: '地圖歷史',
  recentMaps: '最近地圖',
  
  totalServers: '伺服器',
  totalPlayers: '玩家',
  onlineRate: '上線率',
  
  // Auto-join
  autoJoinTitle: '自動加入伺服器',
  autoJoinStart: '開始監控',
  autoJoinStop: '停止監控',
  autoJoinMonitoring: '正在監控伺服器...',
  autoJoinChecking: '正在檢查伺服器狀態...',
  autoJoinWaiting: '等待空位',
  autoJoinDetected: '偵測到空位！',
  autoJoinCheckFailed: '檢查失敗',
  autoJoinMinSlots: '最少空位要求',
  autoJoinSlots: '個空位',
  autoJoinTrigger: '觸發條件',
  autoJoinTriggerDesc: '當在線玩家 ≤',
  autoJoinCurrentPlayers: '目前人數',
  autoJoinRemaining: '剩餘',
  autoJoinNextCheck: '下次檢查',
  autoJoinSeconds: '秒',
  autoJoinButton: '自動加入',
  autoJoinCheckInterval: '檢測間隔',

  // Multi-server (data consolidation)
  multiServerSelect: '多服可選',
  multiServerTitle: '選擇伺服器',
  multiServerJoin: '加入',
  
  // Server detail modal
  serverDetailMap: '地圖',
  serverDetailPlayers: '在線玩家',
  serverDetailGame: '遊戲',
  serverDetailCategory: '分類',
  serverDetailCountry: '國家/地區',
  serverDetailVersion: '版本',
  serverDetailLoad: '伺服器負載',
  serverDetailVac: 'VAC 保護',
  serverDetailPassword: '需要密碼',
  serverDetailMapHistory: '地圖變更歷史',
  serverDetailOnlinePlayers: '在線玩家',
  serverDetailLoading: '載入中...',
  serverDetailNoPlayers: '無法取得玩家列表',
  serverDetailLoginToView: '登入後可查看完整玩家資訊',
  serverDetailMorePlayers: '名玩家未顯示',
  serverDetailNotes: '備註',
  serverDetailMinutes: '分鐘',
  queryRecordsTitle: '查詢記錄與延遲',
  queryTotalQueries: '總查詢次數',
  queryAvgLatency: '平均延遲',
  queryMaxLatency: '最大延遲',
  querySuccessRate: '成功率',
  queryLatencyChart: '查詢延遲趨勢（24小時）',
  queryLatencyChartDesc: '此延遲為本站查詢伺服器的回應時間，不代表您的實際延遲',
  queryRecentRecords: '最近查詢記錄',
  queryLocalNode: '本地查詢',
  queryRemoteNode: '遠端節點',
  querySuccess: '成功',
  queryFailed: '失敗',
  queryNoRecords: '暫無查詢記錄（記錄會在A2S查詢時自動產生，TTL 7200秒）',
  queryError: '錯誤',
  queryA2SData: 'A2S 資料',
  queryClickToExpand: '點擊展開',
  collapse: '收起',
  expand: '展開',
  
  // Add server modal
  addServer: '新增伺服器',
  addServerTitle: '新增伺服器',
  addServerDesc: '新增伺服器需要到網頁登入進行。點擊確認後將在瀏覽器中開啟網站。',
  addServerWebsite: 'servers.upkk.com',
  addServerConfirm: '開啟網站',
  
  // Missing i18n for various components
  online: '線上',
  offline: '離線',
  showOfflineServers: '顯示離線',
  clearOfflineServers: '清理離線',
  realPlayers: '真實玩家',
  playerCountCurve: '玩家人數曲線',
  noPlayerCurveData: '暫無玩家曲線資料',
  serversCount: '個伺服器',
  noHistoryData: '暫無歷史資料',
  bots: '機器人',
  
  // Time periods
  period6h: '6小時',
  period12h: '12小時',
  period24h: '24小時',
  period7d: '7天',
  period30d: '30天',
  
  // Card color for palette
  cardColor: '卡片顏色',
  
  // Region filter
  regionAll: '全部',
  regionChina: '中國',
  regionInternational: '國際',
  
  // Server detail modal extended
  currentStatus: '當前',
  serverRunning: '運行中',
  runtime: '運行時長',
  hoursUnit: '小時',
  minutesUnit: '分鐘',
  loadMapHistory: '載入地圖歷史',
  loadMapHistoryFailed: '載入地圖歷史失敗',
  prevPage: '上一頁',
  nextPage: '下一頁',
  
  // Update modal
  updateAvailable: '發現新版本',
  updateNewVersion: '新版本已發佈！',
  updateCurrentVersion: '當前版本',
  updateLatestVersion: '最新版本',
  updateReleaseDate: '發佈日期',
  updateChangelog: '更新內容',
  updateMandatory: '這是必須更新的版本，請更新後繼續使用應用程式。',
  updateLater: '稍後提醒',
  updateDownloadNow: '立即下載',
  updateDownloading: '正在開啟...',
  updateNoDownloadUrl: '下載地址不可用',
  updateDownloadFailed: '無法開啟下載連結',
  
  // Manual update check
  checkForUpdates: '檢查更新',
  checkingForUpdates: '正在檢查更新...',
  noUpdatesAvailable: '當前已是最新版本',
  updateCheckFailed: '檢查更新失敗',
  
  // Data directory settings
  dataDirectory: '資料保存目錄',
  dataDirectoryDesc: '選擇應用程式資料和設定的保存位置',
  selectDirectory: '選擇目錄',
  currentDirectory: '當前目錄',
  resetToDefault: '恢復預設',
  directoryNotSet: '使用預設位置',
  
  // Loading
  loadingData: '載入中...',
  
  // Monitor page
  tabMonitor: '地圖監控',
  monitorTitle: '地圖監控',
  monitorDesc: '自動監控雲端收藏的伺服器地圖變化，匹配指定地圖時推送通知到桌面、Discord 或 Server醬。您還可利用此功能的自定義 Webhook 對接自己的 QQ 機器人，轉發到 QQ 群等',
  monitorControl: '監控控制',
  monitorStart: '啟動監控',
  monitorStop: '停止監控',
  monitorRunning: '正在監控中...',
  monitorChecks: '檢查次數',
  monitorMatches: '匹配次數',
  monitorLastCheck: '上次檢查',
  monitorNextCheck: '下次檢查',
  monitorInterval: '檢查間隔',
  monitorSeconds: '秒',
  monitorMinute: '分鐘',
  monitorMinutes: '分鐘',
  monitorHour: '小時',
  monitorRules: '監控規則',
  monitorAddRule: '新增規則',
  monitorNoRules: '尚無監控規則',
  monitorNoRulesDesc: '建立規則來監控收藏的伺服器，當特定地圖出現時自動通知',
  monitorNewRule: '新建規則',
  monitorEditRule: '編輯規則',
  monitorDeleteRule: '刪除規則',
  monitorSaveRule: '儲存規則',
  monitorRuleName: '規則名稱',
  monitorRuleNamePlaceholder: '例如：ZE 地圖提醒',
  monitorServerScope: '伺服器範圍',
  monitorAllFavorites: '所有收藏',
  monitorSelectedServers: '指定伺服器',
  monitorServers: '個伺服器',
  monitorPatterns: '個匹配',
  monitorMapPatterns: '地圖名稱匹配',
  monitorMapPatternsHint: '使用 * 作為萬用字元。例如 ze_* 匹配所有 ZE 地圖，*dust* 匹配包含 "dust" 的地圖',
  monitorMapPatternPlaceholder: '例如：ze_*、*dust*、de_mirage',
  monitorAdd: '新增',
  monitorMinPlayers: '最低上線人數',
  monitorCooldown: '通知冷卻時間',
  monitorRequiredMatches: '連續檢測確認次數',
  monitorRequiredMatchesHint: '地圖必須被連續偵測到指定次數後才觸發通知，防止因瞬間地圖變化產生誤報',
  monitorMatchTimes: '次',
  monitorMatchImmediate: '立即通知',
  monitorNotifyChannels: '通知方式',
  monitorDesktopNotify: '桌面通知',
  monitorDesktopNotifyDesc: '匹配到地圖時彈出 Windows 桌面通知',
  monitorDiscordNotify: 'Discord Webhook',
  monitorDiscordNotifyDesc: '透過 Webhook 發送提醒到 Discord 頻道',
  monitorDiscordHelp: '打開 Discord → 進入你的頻道 → 點擊齒輪圖示（編輯頻道）→ 整合 → Webhooks → 新增 Webhook → 複製 Webhook URL 貼到這裡。',
  monitorServerChanNotify: 'Server醬',
  monitorServerChanNotifyDesc: '透過 Server醬 推送通知到微信',
  monitorServerChanHelp: '前往 sct.ftqq.com 登入並取得 SendKey。訊息將透過 Server醬 推送到你的微信。支援微信、企業微信及自訂通道推送。',
  monitorCustomWebhookNotify: '自訂 Webhook',
  monitorCustomWebhookNotifyDesc: '透過 HTTP POST 發送到自訂網址（適合有開發能力的使用者）',
  monitorCustomWebhookHelp: '輸入你的自訂 Webhook 網址。匹配到地圖時會向該網址發送包含 JSON 資料的 POST 請求。適合有開發能力的使用者，例如透過 BOT 程式將通知轉發到 QQ 群等平台。',
  monitorCustomWebhookFieldsTitle: '查看 POST JSON 欄位說明',
  monitorCustomMessageTemplate: '自訂訊息模板',
  monitorCustomMessageTemplateDesc: '使用佔位符自訂通知內容，留空則使用預設格式。點擊佔位符可快速新增。',
  monitorMessagePreview: '預覽：',
  monitorPlaceholder_servername: '伺服器名稱',
  monitorPlaceholder_mapname: '地圖名稱',
  monitorPlaceholder_players: '目前人數',
  monitorPlaceholder_maxplayers: '最大人數',
  monitorPlaceholder_address: '地址',
  monitorPlaceholder_rulename: '規則名稱',
  monitorPlaceholder_pattern: '匹配模式',
  monitorPlaceholder_time: '通知時間',
  monitorTest: '測試',
  monitorTestWebhook: '測試 Webhook',
  monitorTestSuccess: '發送成功',
  monitorTestFailed: '發送失敗',
  monitorTesting: '測試中...',
  monitorRecentMatches: '最近匹配紀錄',
  monitorActiveMatches: '匹配伺服器',
  monitorJoinServer: '加入',
  monitorAutoJoin: '自動加入伺服器',
  monitorAutoJoinDesc: '匹配時自動加入第一個匹配的伺服器，加入後監控自動停止。',
  monitorAutoJoinWarning: '⚠️ 開啟此選項後，加入伺服器命令發出後將自動關閉監控。如果您是作為通知 Bot 來使用，請不要開啟此選項，以免監控被自動停止。',
  monitorLoginRequired: '需要登入',
  monitorLoginRequiredDesc: '請先登入以使用地圖監控功能，該功能透過查詢雲端收藏來取得伺服器狀態。',
  monitorLoginSuggested: '建議登入',
  monitorLoginSuggestedDesc: '登入後可同步雲端收藏。未登入也可使用本地收藏進行地圖監控。',
  monitorMapPatternAddReminder: '⚠️ 輸入地圖名稱後，不要忘記點擊「新增」按鈕！',
  monitorAlertTitle: '通知標題',
  monitorAlertTitleDesc: '自訂 Discord/Server醬 通知的標題，支援佔位符。留空則使用預設標題。',
  monitorAlertTitlePlaceholder: '🎮 Server Map Alert',
  monitorSelectFromFavorites: '從雲端收藏中選擇',
  monitorLocalFavorites: '本地收藏',
  monitorLoadingFavorites: '載入收藏清單中...',
  monitorNoFavoritesAvailable: '尚無收藏伺服器',
  monitorSelectedCount: '已選擇',
  monitorSearchServers: '搜尋伺服器...',
  monitorMonitoredServers: '監控中的伺服器',
  monitorRemoveServer: '從所有規則中移除',
  monitorNoActiveMatches: '尚無匹配的伺服器。當監控的伺服器載入匹配的地圖時，將在此顯示。',
  monitorStartPrompt: '開始監控？',
  monitorRestartPrompt: '重新開始監控？',
  monitorStartPromptDesc: '規則已儲存。是否立即開始監控？',
  monitorLater: '稍後',
  monitorRestart: '重新開始',
  // A2S test
  a2sTest: 'A2S 伺服器查詢',
  a2sTestDesc: '測試本地 A2S UDP 查詢遊戲伺服器（支持IP和域名）',
  a2sTestPlaceholder: 'IP或域名，例如 1.2.3.4:27015 / example.com:27015',
  a2sTestQuery: '查詢',
  a2sTestQuerying: '查詢中...',
  a2sTestResult: '查詢結果',
  a2sTestError: '查詢失敗',
  a2sTestNotAvailable: 'A2S 查詢僅在桌面客戶端可用',
  a2sServerName: '伺服器名稱',
  a2sMap: '地圖',
  a2sPlayers: '玩家',
  a2sGame: '遊戲',
  a2sServerType: '伺服器類型',
  a2sEnvironment: '運行環境',
  a2sVac: 'VAC',
  a2sPassword: '密碼保護',
  a2sVersion: '版本',
  a2sYes: '是',
  a2sNo: '否',
  // Notification sound
  notificationSound: '通知提示音',
  notificationSoundEnabled: '啟用提示音',
  notificationSoundEnabledDesc: '地圖監控通知時播放提示音',
  notificationSoundType: '提示音風格',
  soundType_chime: '鈴聲',
  soundType_bubble: '氣泡',
  soundType_bell: '鐘聲',
};

// Korean translations
const ko: Translations = {
  appName: 'Upkk 서버 브라우저',
  appSubtitle: '게임 서버 브라우저',
  
  tabServers: '서버',
  tabFavorites: '클라우드 즐겨찾기',
  tabForum: '포럼',
  tabCheckIn: '출석체크',
  tabSettings: '설정',
  
  settings: '설정',
  settingsDesc: '애플리케이션 옵션 및 외관 설정',
  generalSettings: '일반 설정',
  appearance: '외관',
  colorPalette: '색상 팔레트',
  
  apiSettings: 'API 설정',
  apiServerAddress: 'API 서버 주소',
  apiServerHint: '서버 API 주소 입력, 예: https://servers.upkk.com',
  autoRefresh: '자동 새로고침',
  refreshInterval: '새로고침 간격',
  refreshIntervalHint: '서버 목록 자동 새로고침 간격 설정',
  autoRefreshEnabled: '자동 새로고침 활성화, 매',
  dataManagement: '데이터 관리',
  clearData: '앱 데이터 삭제',
  clearDataDesc: '로그인 상태, 테마 설정, 즐겨찾기 및 캐시를 포함한 모든 로컬 데이터를 삭제합니다. 삭제 후 앱이 자동으로 다시 시작됩니다.',
  clearDataBtn: '데이터 삭제',
  saveSettings: '설정 저장',
  saved: '✓ 저장됨',
  
  languageSettings: '언어',
  languageLabel: '표시 언어',
  languageAuto: '자동 (시스템)',
  
  refreshOff: '끄기',
  refreshSeconds: '30초',
  refreshMinute: '1분',
  refresh2Minutes: '2분',
  refresh5Minutes: '5분',
  refresh10Minutes: '10분',
  refreshCustom: '사용자 지정',
  refreshCustomSeconds: '초',
  refreshCustomHint: '정수를 입력하세요, 최소 10초',
  
  confirmClearData: '데이터 삭제 확인',
  clearDataWarning: '모든 앱 데이터를 삭제하시겠습니까? 다음이 삭제됩니다:',
  clearLoginStatus: '로그인 상태 및 사용자 정보 삭제',
  clearThemeSettings: '테마 및 외관 설정 삭제',
  clearFavorites: '즐겨찾기 및 개인 설정 삭제',
  clearCacheData: '로컬 캐시 데이터 삭제',
  clearDataIrreversible: '⚠️ 이 작업은 취소할 수 없습니다. 앱이 자동으로 다시 시작됩니다.',
  cancel: '취소',
  confirmClearRestart: '삭제 및 다시 시작',
  clearing: '삭제 중...',
  
  darkMode: '다크 모드',
  darkModeDesc: '라이트/다크 테마 전환',
  glassEffect: '글라스 효과',
  glassEffectDesc: '반투명 블러 효과 활성화',
  backgroundImage: '배경 이미지',
  selectImage: '이미지 선택',
  changeImage: '이미지 변경',
  clearBackground: '삭제',
  backgroundOpacity: '배경 불투명도',
  resetAppearance: '모든 외관 설정 초기화',
  
  multiRegionPalette: '다중 영역 팔레트',
  multiRegionPaletteDesc: 'RGBA 지원으로 각 UI 영역의 색상을 사용자 정의',
  resetAllColors: '모든 색상 초기화',
  primaryColor: '기본 색상',
  secondaryColor: '보조 색상',
  accentColor: '강조 색상',
  headerColor: '헤더',
  sidebarColor: '카드 배경',
  backgroundColor: '페이지 배경',
  textColor: '텍스트 색상',
  
  appVersion: 'Upkk Server Browser Desktop v1.0.0',
  basedOn: 'Tauri + React + WebView2 기반',
  
  refreshServerList: '서버 목록 새로고침',
  loadingServers: '서버 로딩 중...',
  noServersFound: '서버를 찾을 수 없습니다',
  noServersHint: 'API 연결을 확인하거나 다른 검색 조건을 시도하세요',
  noFavoriteServers: '즐겨찾기한 서버가 없습니다',
  noFavoriteServersHint: '서버 카드의 별표 아이콘을 클릭하여 즐겨찾기에 추가',
  showAllServers: '모든 서버 표시',
  
  cloudFavorites: '클라우드 즐겨찾기',
  cloudFavoritesDesc: '로그인하여 즐겨찾기를 클라우드에 동기화하고 모든 기기에서 액세스하세요.',
  loginWithSteam: 'Steam으로 로그인',
  loginWithGoogle: 'Google로 로그인',
  loginWithDiscord: 'Discord로 로그인',
  loginWithUpkk: '[중국 대륙] Upkk 포럼으로 로그인',
  loginChooseProvider: '로그인 방법 선택',
  syncFavoritesHint: '로그인 후 웹 버전과 데스크톱 버전 간에 즐겨찾기 동기화',
  myFavorites: '내 즐겨찾기',
  welcome: '환영합니다',
  favorites: '개의 즐겨찾기',
  refresh: '새로고침',
  loadingFavorites: '즐겨찾기 로딩 중...',
  loadFailed: '로딩 실패',
  retry: '다시 시도',
  noFavorites: '즐겨찾기 없음',
  noFavoritesHint: '서버 목록에서 ⭐ 버튼을 클릭하여 즐겨찾기에 추가',
  join: '참가',
  removeFavorite: '즐겨찾기에서 제거',
  confirmRemoveFavorite: '즐겨찾기를 삭제하시겠습니까?',
  confirmRemoveFavoriteDesc: '이 서버를 즐겨찾기에서 삭제하시겠습니까?',
  addFavoriteTitle: '즐겨찾기 서버 추가',
  addFavoriteDesc: '서버 IP 주소와 포트를 입력하여 즐겨찾기에 추가',
  serverNameOptional: '서버 이름 (선택)',
  notesOptional: '메모 (선택)',
  addToFavorites: '즐겨찾기에 추가',
  searchFavorites: '즐겨찾기 검색...',
  filterByGame: '게임별 필터',
  allGames: '모든 게임',
  notes: '메모',
  moveUp: '위로 이동',
  moveDown: '아래로 이동',
  itemsPerPage: '페이지당',
  addToCloudPrompt: '클라우드 즐겨찾기에 추가하시겠습니까?',
  addToCloudPromptDesc: '이 서버를 클라우드 즐겨찾기에도 저장하여 다른 기기에서 액세스하시겠습니까?',
  removeFromCloudPrompt: '클라우드 즐겨찾기에서 삭제하시겠습니까?',
  removeFromCloudPromptDesc: '이 서버를 클라우드 즐겨찾기에서도 삭제하시겠습니까?',
  playerScore: '점수',
  playerDuration: '플레이 시간',
  authenticatedView: '인증됨 - 전체 플레이어 이름 표시',
  loginFirst: '먼저 로그인해 주세요',
  loginForAutoLogin: '로그인하면 포럼에 자동 로그인됩니다',
  clickToLogin: '로그인',
  openingForum: '포럼 열는 중...',
  usingWebView2: '네이티브 WebView2 브라우저 사용',
  openForumFailed: '포럼 열기 실패',
  cannotOpenWebView2: 'WebView2 창을 열 수 없습니다',
  forumOpened: '포럼이 열렸습니다',
  loggedInAutoLogin: '로그인됨: {username} (포럼 자동 로그인)',
  notLoggedInGuest: '로그인되지 않음, 게스트로 포럼 접속',
  forumRunsInWindow: '포럼은 별도의 창에서 전체 브라우징 기능으로 실행됩니다.',
  forumMultiTabSupport: '다중 탭 브라우징 지원! 링크를 클릭하면 새 탭에서 열립니다.',
  reopenForum: '포럼 창 다시 열기',
  openInBrowser: '시스템 브라우저에서 열기',
  secureConnection: '보안 연결',
  tauriNotDetected: 'Tauri 환경이 감지되지 않았습니다. 데스크톱 앱에서 실행하세요.',
  openForumFailedMsg: '포럼 열기 실패',
  
  dailyCheckIn: '일일 출석체크',
  checkInDesc: '매일 출석체크하여 포럼 포인트 획득',
  checkInNow: '지금 출석체크',
  checkingIn: '출석체크 중...',
  pleaseLoginFirst: '로그인해 주세요',
  loggedInAs: '로그인됨: {username}',
  goToForum: '포럼으로 이동',
  loginForCheckIn: '출석체크하려면 로그인이 필요합니다',
  usingSteamID64: 'SteamID64로 안전하게 로그인',
  
  players: '플레이어',
  ping: '핑',
  map: '맵',
  category: '카테고리',
  version: '버전',
  
  allRegions: '모든 지역',
  asia: '아시아',
  europe: '유럽',
  northAmerica: '북미',
  southAmerica: '남미',
  oceania: '오세아니아',
  searchPlaceholder: '서버 검색...',
  allCategories: '모든 카테고리',
  showFavoritesOnly: '즐겨찾기만',
  searchLocalFavorites: '로컬 즐겨찾기 검색...',
  addLocalServer: '서버 추가',
  addLocalServerDesc: '서버 IP 또는 도메인과 포트를 입력하여 로컬 즐겨찾기에 추가. 로컬 A2S 쿼리 사용.',
  addLocalServerSuccess: '서버가 로컬 즐겨찾기에 추가되었습니다',
  addLocalServerDuplicate: '서버가 이미 로컬 즐겨찾기에 있습니다',
  invalidAddressFormat: '잘못된 주소 형식입니다. IP:Port 또는 도메인:port를 사용하세요 (예: 192.168.1.1:27015)',
  exportFavorites: '내보내기',
  importFavorites: '가져오기',
  exportFavoritesSuccess: '로컬 즐겨찾기를 내보냈습니다: ',
  importFavoritesSuccess: '즐겨찾기 가져오기 성공',
  importFavoritesError: '즐겨찾기 가져오기 실패',
  
  // Game type filter
  gameAll: '모든 게임',
  gameCs2: 'CS2',
  gameCsgo: 'CSGO',
  
  perPage: '페이지당',
  page: '페이지',
  
  cardView: '카드 보기',
  listView: '목록 보기',
  
  login: '로그인',
  logout: '로그아웃',
  loginToSync: '동기화하려면 로그인',
  
  useSteamChina: 'Steam 중국 사용',
  steamProtocol: 'steam://',
  steamChinaProtocol: 'steamchina://',
  steamClientSetting: 'Steam 클라이언트',
  steamClientSettingDesc: '서버 참가 시 사용할 Steam 클라이언트를 선택하세요',
  steamInternational: 'Steam',
  steamChina: 'Steam 중국',
  steamSwitchConfirmTitle: 'Steam 클라이언트 전환 확인',
  steamSwitchToChina: 'Steam 중국으로 전환하시겠습니까?',
  steamSwitchToChinaWarning: '⚠️ Steam 중국 클라이언트를 사용하는 경우에만 활성화하세요',
  steamSwitchToInternational: 'Steam (국제)으로 전환하시겠습니까?',
  steamSwitchedToInternational: '✅ Steam (국제)으로 전환되었습니다',
  steamSwitchedToChina: '⚠️ Steam 중국으로 전환되었습니다 — Steam 중국 클라이언트를 사용하는 경우에만 활성화하세요',
  steamConfirm: '확인',
  steamCancel: '취소',
  steamHeaderTooltipInternational: 'Steam (국제) — 클릭하여 Steam 중국으로 전환',
  steamHeaderTooltipChina: 'Steam 중국 — 클릭하여 Steam (국제)으로 전환',
  
  serverDetails: '서버 상세 정보',
  serverAddress: '서버 주소',
  joinServer: '서버 참가',
  copyAddress: '주소 복사',
  addressCopied: '주소가 복사되었습니다!',
  playerHistory: '플레이어 기록',
  mapHistory: '맵 기록',
  recentMaps: '최근 맵',
  
  totalServers: '서버',
  totalPlayers: '플레이어',
  onlineRate: '온라인 비율',
  
  // Auto-join
  autoJoinTitle: '자동 참가',
  autoJoinStart: '모니터링 시작',
  autoJoinStop: '모니터링 중지',
  autoJoinMonitoring: '서버 모니터링 중...',
  autoJoinChecking: '서버 상태 확인 중...',
  autoJoinWaiting: '슬롯 대기 중',
  autoJoinDetected: '슬롯 감지됨!',
  autoJoinCheckFailed: '확인 실패',
  autoJoinMinSlots: '최소 필요 슬롯',
  autoJoinSlots: '슬롯',
  autoJoinTrigger: '트리거 조건',
  autoJoinTriggerDesc: '온라인 플레이어 ≤',
  autoJoinCurrentPlayers: '현재',
  autoJoinRemaining: '남음',
  autoJoinNextCheck: '다음 확인',
  autoJoinSeconds: '초',
  autoJoinButton: '자동 참가',
  autoJoinCheckInterval: '확인 간격',

  // Multi-server (data consolidation)
  multiServerSelect: '멀티 서버',
  multiServerTitle: '서버 선택',
  multiServerJoin: '참가',
  
  // Server detail modal
  serverDetailMap: '맵',
  serverDetailPlayers: '온라인 플레이어',
  serverDetailGame: '게임',
  serverDetailCategory: '카테고리',
  serverDetailCountry: '국가/지역',
  serverDetailVersion: '버전',
  serverDetailLoad: '서버 부하',
  serverDetailVac: 'VAC 보호',
  serverDetailPassword: '비밀번호 필요',
  serverDetailMapHistory: '맵 변경 기록',
  serverDetailOnlinePlayers: '온라인 플레이어',
  serverDetailLoading: '로딩 중...',
  serverDetailNoPlayers: '플레이어 목록을 가져올 수 없습니다',
  serverDetailLoginToView: '로그인하여 전체 플레이어 정보 보기',
  serverDetailMorePlayers: '명의 플레이어가 표시되지 않음',
  serverDetailNotes: '비고',
  serverDetailMinutes: '분',
  queryRecordsTitle: '쿼리 기록 및 지연',
  queryTotalQueries: '총 쿼리 수',
  queryAvgLatency: '평균 지연',
  queryMaxLatency: '최대 지연',
  querySuccessRate: '성공률',
  queryLatencyChart: '쿼리 지연 추세 (24시간)',
  queryLatencyChartDesc: '이 지연은 본 사이트가 게임 서버를 조회한 응답 시간이며, 실제 지연이 아닙니다',
  queryRecentRecords: '최근 쿼리 기록',
  queryLocalNode: '로컬',
  queryRemoteNode: '원격',
  querySuccess: '성공',
  queryFailed: '실패',
  queryNoRecords: '아직 쿼리 기록이 없습니다 (A2S 쿼리 시 자동 생성, TTL 7200초)',
  queryError: '오류',
  queryA2SData: 'A2S 데이터',
  queryClickToExpand: '클릭하여 펼치기',
  collapse: '접기',
  expand: '펼치기',
  
  // Add server modal
  addServer: '서버 추가',
  addServerTitle: '서버 추가',
  addServerDesc: '서버 추가는 웹사이트에서 로그인 후 가능합니다. 확인을 클릭하면 브라우저에서 웹사이트가 열립니다.',
  addServerWebsite: 'servers.upkk.com',
  addServerConfirm: '웹사이트 열기',
  
  // Missing i18n for various components
  online: '온라인',
  offline: '오프라인',
  showOfflineServers: '오프라인 표시',
  clearOfflineServers: '오프라인 삭제',
  realPlayers: '실제 플레이어',
  playerCountCurve: '플레이어 수 곡선',
  noPlayerCurveData: '플레이어 곡선 데이터 없음',
  serversCount: '서버',
  noHistoryData: '기록 데이터 없음',
  bots: '봇',
  
  // Time periods
  period6h: '6시간',
  period12h: '12시간',
  period24h: '24시간',
  period7d: '7일',
  period30d: '30일',
  
  // Card color for palette
  cardColor: '카드 색상',
  
  // Region filter
  regionAll: '전체',
  regionChina: '중국',
  regionInternational: '해외',
  
  // Server detail modal extended
  currentStatus: '현재',
  serverRunning: '실행 중',
  runtime: '가동 시간',
  hoursUnit: '시간',
  minutesUnit: '분',
  loadMapHistory: '맵 기록 로드',
  loadMapHistoryFailed: '맵 기록 로드 실패',
  prevPage: '이전',
  nextPage: '다음',
  
  // Update modal
  updateAvailable: '업데이트 가능',
  updateNewVersion: '새 버전이 있습니다!',
  updateCurrentVersion: '현재 버전',
  updateLatestVersion: '최신 버전',
  updateReleaseDate: '출시일',
  updateChangelog: '업데이트 내용',
  updateMandatory: '필수 업데이트입니다. 계속하려면 업데이트하세요.',
  updateLater: '나중에',
  updateDownloadNow: '지금 다운로드',
  updateDownloading: '여는 중...',
  updateNoDownloadUrl: '다운로드 URL을 사용할 수 없습니다',
  updateDownloadFailed: '다운로드 링크를 열지 못했습니다',
  
  // Manual update check
  checkForUpdates: '업데이트 확인',
  checkingForUpdates: '업데이트 확인 중...',
  noUpdatesAvailable: '최신 버전을 사용하고 있습니다',
  updateCheckFailed: '업데이트 확인 실패',
  
  // Data directory settings
  dataDirectory: '데이터 저장 폴더',
  dataDirectoryDesc: '앱 데이터와 설정의 저장 위치 선택',
  selectDirectory: '폴더 선택',
  currentDirectory: '현재 폴더',
  resetToDefault: '기본값으로',
  directoryNotSet: '기본 위치 사용',
  
  // Loading
  loadingData: '로딩 중...',
  
  // Monitor page
  tabMonitor: '맵 모니터',
  monitorTitle: '맵 모니터',
  monitorDesc: '즐겨찾기 서버의 특정 맵을 자동으로 모니터링하고 알림 받기. 사용자 정의 Webhook으로 자체 봇과 연동 가능',
  monitorControl: '모니터 제어',
  monitorStart: '모니터 시작',
  monitorStop: '모니터 중지',
  monitorRunning: '모니터링 중...',
  monitorChecks: '확인 횟수',
  monitorMatches: '매치 횟수',
  monitorLastCheck: '마지막 확인',
  monitorNextCheck: '다음 확인',
  monitorInterval: '확인 간격',
  monitorSeconds: '초',
  monitorMinute: '분',
  monitorMinutes: '분',
  monitorHour: '시간',
  monitorRules: '모니터 규칙',
  monitorAddRule: '규칙 추가',
  monitorNoRules: '모니터 규칙 없음',
  monitorNoRulesDesc: '규칙을 만들어 즐겨찾기 서버의 특정 맵을 모니터링하세요',
  monitorNewRule: '새 규칙',
  monitorEditRule: '규칙 편집',
  monitorDeleteRule: '규칙 삭제',
  monitorSaveRule: '규칙 저장',
  monitorRuleName: '규칙 이름',
  monitorRuleNamePlaceholder: '예: ZE 맵 알림',
  monitorServerScope: '서버 범위',
  monitorAllFavorites: '모든 즐겨찾기',
  monitorSelectedServers: '선택한 서버',
  monitorServers: '서버',
  monitorPatterns: '패턴',
  monitorMapPatterns: '맵 이름 패턴',
  monitorMapPatternsHint: '* 를 와일드카드로 사용. 예: ze_* 는 모든 ZE 맵, *dust* 는 "dust"를 포함하는 맵',
  monitorMapPatternPlaceholder: '예: ze_*, *dust*, de_mirage',
  monitorAdd: '추가',
  monitorMinPlayers: '최소 플레이어 수',
  monitorCooldown: '알림 쿨다운',
  monitorRequiredMatches: '연속 감지 확인 횟수',
  monitorRequiredMatchesHint: '알림을 보내기 전에 맵이 이 횟수만큼 연속으로 감지되어야 합니다. 일시적인 맵 변경으로 인한 오보를 방지합니다',
  monitorMatchTimes: '회',
  monitorMatchImmediate: '즉시 알림',
  monitorNotifyChannels: '알림 채널',
  monitorDesktopNotify: '데스크톱 알림',
  monitorDesktopNotifyDesc: '매치 시 Windows 데스크톱 알림 표시',
  monitorDiscordNotify: 'Discord Webhook',
  monitorDiscordNotifyDesc: 'Webhook으로 Discord 채널에 알림 전송',
  monitorDiscordHelp: 'Discord 열기 → 채널로 이동 → 톱니바퀴 아이콘(채널 편집) 클릭 → 연동 → Webhooks → 새 Webhook → Webhook URL을 복사하여 여기에 붙여넣으세요.',
  monitorServerChanNotify: 'Server Chan (Server酱)',
  monitorServerChanNotifyDesc: 'Server Chan을 통해 WeChat으로 알림 전송',
  monitorServerChanHelp: 'sct.ftqq.com에서 SendKey를 받으세요. Server Chan 서비스를 통해 WeChat으로 메시지가 전송됩니다. WeChat, 기업 WeChat 및 사용자 정의 채널을 지원합니다.',
  monitorCustomWebhookNotify: '사용자 정의 Webhook',
  monitorCustomWebhookNotifyDesc: '사용자 정의 URL로 HTTP POST 전송 (개발자용)',
  monitorCustomWebhookHelp: '사용자 정의 Webhook URL을 입력하세요. 맵이 매칭되면 JSON 데이터가 포함된 POST 요청이 해당 URL로 전송됩니다. BOT 프로그램을 통해 QQ 그룹 등 플랫폼에 알림을 전달하려는 개발자에게 적합합니다.',
  monitorCustomWebhookFieldsTitle: 'POST JSON 필드 보기',
  monitorCustomMessageTemplate: '사용자 정의 메시지 템플릿',
  monitorCustomMessageTemplateDesc: '플레이스홀더를 사용하여 알림 내용을 사용자 정의할 수 있습니다. 비워두면 기본 형식이 사용됩니다. 플레이스홀더를 클릭하여 추가할 수 있습니다.',
  monitorMessagePreview: '미리보기:',
  monitorPlaceholder_servername: '서버 이름',
  monitorPlaceholder_mapname: '맵 이름',
  monitorPlaceholder_players: '현재 인원',
  monitorPlaceholder_maxplayers: '최대 인원',
  monitorPlaceholder_address: '주소',
  monitorPlaceholder_rulename: '규칙 이름',
  monitorPlaceholder_pattern: '패턴',
  monitorPlaceholder_time: '시간',
  monitorTest: '테스트',
  monitorTestWebhook: 'Webhook 테스트',
  monitorTestSuccess: '성공',
  monitorTestFailed: '실패',
  monitorTesting: '테스트 중...',
  monitorRecentMatches: '최근 매치 기록',
  monitorActiveMatches: '매치된 서버',
  monitorJoinServer: '참가',
  monitorAutoJoin: '서버 자동 참가',
  monitorAutoJoinDesc: '첫 번째 매치된 서버에 자동으로 참가합니다. 참가 후 모니터링이 중지됩니다.',
  monitorAutoJoinWarning: '⚠️ 이 옵션을 활성화하면 서버 참가 후 모니터링이 자동으로 중지됩니다. 알림 봇으로 사용하는 경우 모니터링이 의도치 않게 중지되는 것을 방지하기 위해 이 옵션을 활성화하지 마세요.',
  monitorLoginRequired: '로그인 필요',
  monitorLoginRequiredDesc: '맵 모니터를 사용하려면 로그인하세요. 클라우드 즐겨찾기에서 서버 상태를 조회합니다.',
  monitorLoginSuggested: '로그인 권장',
  monitorLoginSuggestedDesc: '클라우드 즐겨찾기를 동기화하려면 로그인하세요. 로그인하지 않아도 로컬 즐겨찾기로 맵 모니터링을 사용할 수 있습니다.',
  monitorMapPatternAddReminder: '⚠️ 맵 이름 패턴을 입력한 후 "추가" 버튼을 클릭하는 것을 잊지 마세요!',
  monitorAlertTitle: '알림 제목',
  monitorAlertTitleDesc: 'Discord/ServerChan 알림 제목을 사용자 정의합니다. 플레이스홀더를 지원합니다. 비워두면 기본값이 사용됩니다.',
  monitorAlertTitlePlaceholder: '🎮 Server Map Alert',
  monitorSelectFromFavorites: '클라우드 즐겨찾기에서 선택',
  monitorLocalFavorites: '로컬 즐겨찾기',
  monitorLoadingFavorites: '즐겨찾기 로딩 중...',
  monitorNoFavoritesAvailable: '즐겨찾기 없음',
  monitorSelectedCount: '선택됨',
  monitorSearchServers: '서버 검색...',
  monitorMonitoredServers: '모니터링 중인 서버',
  monitorRemoveServer: '모든 규칙에서 제거',
  monitorNoActiveMatches: '아직 일치하는 서버가 없습니다. 모니터링 중인 서버가 일치하는 맵을 로드하면 여기에 표시됩니다.',
  monitorStartPrompt: '모니터링을 시작하시겠습니까?',
  monitorRestartPrompt: '모니터링을 다시 시작하시겠습니까?',
  monitorStartPromptDesc: '규칙이 저장되었습니다. 지금 모니터링을 시작하시겠습니까?',
  monitorLater: '나중에',
  monitorRestart: '다시 시작',
  // A2S test
  a2sTest: 'A2S 서버 쿼리',
  a2sTestDesc: '게임 서버에 로컬 A2S UDP 쿼리 테스트 (IP 및 도메인 지원)',
  a2sTestPlaceholder: 'IP 또는 도메인, 예: 1.2.3.4:27015 / example.com:27015',
  a2sTestQuery: '쿼리',
  a2sTestQuerying: '쿼리 중...',
  a2sTestResult: '쿼리 결과',
  a2sTestError: '쿼리 실패',
  a2sTestNotAvailable: 'A2S 쿼리는 데스크톱 앱에서만 사용 가능합니다',
  a2sServerName: '서버 이름',
  a2sMap: '맵',
  a2sPlayers: '플레이어',
  a2sGame: '게임',
  a2sServerType: '서버 유형',
  a2sEnvironment: '환경',
  a2sVac: 'VAC',
  a2sPassword: '비밀번호',
  a2sVersion: '버전',
  a2sYes: '예',
  a2sNo: '아니오',
  // Notification sound
  notificationSound: '알림 소리',
  notificationSoundEnabled: '소리 활성화',
  notificationSoundEnabledDesc: '맵 모니터 알림 시 소리 재생',
  notificationSoundType: '소리 스타일',
  soundType_chime: '차임',
  soundType_bubble: '버블',
  soundType_bell: '벨',
};

// All translations
const translations: Record<Language, Translations> = {
  'en': en,
  'ja': ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ko': ko,
};

// Language context
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language | 'auto') => void;
  t: Translations;
  isAuto: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Storage key
const LANGUAGE_STORAGE_KEY = 'upkk-language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [isAuto, setIsAuto] = useState<boolean>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === null || stored === 'auto';
  });
  
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored !== 'auto' && (stored === 'en' || stored === 'ja' || stored === 'zh-CN' || stored === 'zh-TW' || stored === 'ko')) {
      return stored;
    }
    return detectSystemLanguage();
  });

  // Update language when system language changes (for auto mode)
  useEffect(() => {
    if (isAuto) {
      const handleLanguageChange = () => {
        setLanguageState(detectSystemLanguage());
      };
      
      // Listen for language changes
      window.addEventListener('languagechange', handleLanguageChange);
      return () => window.removeEventListener('languagechange', handleLanguageChange);
    }
  }, [isAuto]);

  const setLanguage = useCallback((lang: Language | 'auto') => {
    if (lang === 'auto') {
      setIsAuto(true);
      setLanguageState(detectSystemLanguage());
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'auto');
    } else {
      setIsAuto(false);
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  }, []);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    isAuto,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Helper to get current language label
export function getLanguageLabel(lang: Language | 'auto', currentLang: Language): string {
  if (lang === 'auto') {
    return `Auto (${languageLabels[currentLang]})`;
  }
  return languageLabels[lang];
}
