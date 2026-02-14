// Server status types matching the Go backend models (API uses lowercase snake_case)

export interface ServerStatus {
  // API response fields (lowercase)
  name: string;
  ip: string;
  port: string | number;
  game: string;
  region: string;
  mode: string;
  players: number;
  max_players: number;
  bots: number;
  real_players: number;
  map_name: string;
  comments: string;
  display_address: string;
  mapnamecn: string;
  map_image_url?: string;  // URL to map preview image
  category: string;
  priority: number;
  config_order: number;
  admin_sort_priority: number;
  submitter_uid: number;
  country_code: string;
  country_name: string;
  server_type: string;
  environment: string;
  vac: boolean;
  password: boolean;
  version: string;
  game_id: number;
  last_updated: string;
  
  // Legacy compatibility (PascalCase - may not be present in new API)
  ID?: number;
  Addr?: string;
  Port?: number;
  QueryPort?: number;
  Name?: string;
  Map?: string;
  GameDir?: string;
  GameDesc?: string;
  Players?: number;
  MaxPlayers?: number;
  Bots?: number;
  ServerType?: string;
  Environment?: string;
  Visibility?: boolean;
  VAC?: boolean;
  Version?: string;
  Keywords?: string;
  GameID?: number;
  Ping?: number;
  Country?: string;
  CountryCode?: string;
  Online?: boolean;
  LastUpdate?: string;
  DatabaseID?: number;
  Source?: string;
  Category?: string;
  IsFavorite?: boolean;

  // Server consolidation: alternate servers with same name+port but different IPs
  alternate_servers?: AlternateServer[];
}

// AlternateServer represents an alternate IP for a consolidated server group
export interface AlternateServer {
  ip: string;
  port: string;
  country_code: string;
  country_name: string;
  real_players: number;
  max_players: number;
}

export interface Player {
  Name?: string;
  name?: string;
  Score?: number;
  score?: number;
  Duration?: number;
  duration?: number;
  DurationStr?: string;
}

export interface ServerDetail extends ServerStatus {
  Rules?: Record<string, string>;
  PlayerList?: Player[];
}

export interface Category {
  id: string;
  name: string;
  display_name: string;
  display_name_en: string;
  game_id: number;
  icon: string;
  color: string;
  sort_order: number;
  enabled: boolean;
  count?: number;  // Server count in this category
}

export interface ServerStats {
  total_servers: number;
  online_servers: number;
  total_players: number;
  total_max_players: number;
  by_country?: Record<string, number>;
}

export interface PaginatedResponse<T> {
  servers: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SearchResponse extends PaginatedResponse<ServerStatus> {
  query: string;
  region: string;
  count: number;
}

export type ServerRegion = 'all' | 'cn' | 'global' | 'nmrih' | 'tf2' | 'insurgency';

// Game type filter: CS2 or CSGO
export type GameType = 'all' | 'cs2' | 'csgo';
