export interface A2SQueryResult {
  success: boolean;
  error?: string;
  ip: string;
  port: string;
  name: string;
  map_name: string;
  game: string;
  players: number;
  max_players: number;
  bots: number;
  real_players: number;
  server_type: string;
  environment: string;
  password: boolean;
  vac: boolean;
  version: string;
  latency_ms?: number;
}

export interface A2SQueryTarget {
  ip: string;
  port: string;
  timeoutMs?: number;
}

export interface CredentialResponse {
  success: boolean;
  message: string;
  steamid64?: string;
  securecode?: string;
}

export interface ApiTokenResponse {
  success: boolean;
  message: string;
  token?: string;
}

interface DesktopCommand<Args, Result> {
  args: Args;
  result: Result;
}

export interface DesktopCommandMap {
  open_forum_window: DesktopCommand<undefined, void>;
  open_forum_with_login: DesktopCommand<{ uid: string; auth: string }, void>;
  open_url_in_browser_window: DesktopCommand<{
    windowLabel: string;
    url: string;
    title: string;
  }, void>;
  open_steam_login: DesktopCommand<{ loginUrl: string }, void>;
  open_checkin_page: DesktopCommand<undefined, void>;
  close_window: DesktopCommand<{ windowLabel: string }, void>;
  forum_navigate: DesktopCommand<{ url: string }, void>;
  forum_reload: DesktopCommand<undefined, void>;
  forum_go_back: DesktopCommand<undefined, void>;
  forum_go_forward: DesktopCommand<undefined, void>;
  forum_get_url: DesktopCommand<undefined, string>;
  query_server_a2s: DesktopCommand<{
    ip: string;
    port: string;
    timeoutMs?: number;
  }, A2SQueryResult>;
  query_servers_a2s: DesktopCommand<{
    targets: A2SQueryTarget[];
    concurrency?: number;
  }, A2SQueryResult[]>;
  save_credentials: DesktopCommand<{
    steamid64: string;
    securecode: string;
  }, CredentialResponse>;
  load_credentials: DesktopCommand<undefined, CredentialResponse>;
  clear_credentials: DesktopCommand<undefined, CredentialResponse>;
  get_device_fingerprint: DesktopCommand<undefined, string>;
  has_stored_credentials: DesktopCommand<undefined, boolean>;
  save_api_token: DesktopCommand<{ token: string }, ApiTokenResponse>;
  load_api_token: DesktopCommand<undefined, ApiTokenResponse>;
  clear_api_token: DesktopCommand<undefined, ApiTokenResponse>;
  write_text_file: DesktopCommand<{ path: string; contents: string }, void>;
  save_monitor_data: DesktopCommand<{ data: string }, void>;
  load_monitor_data: DesktopCommand<undefined, string>;
}

export interface DesktopEventMap {
  'login-token-ready': string;
  'login-window-closed': void;
}

export type DesktopCommandName = keyof DesktopCommandMap;
export type DesktopCommandArgs<Name extends DesktopCommandName> = DesktopCommandMap[Name]['args'];
export type DesktopCommandResult<Name extends DesktopCommandName> = DesktopCommandMap[Name]['result'];
export type DesktopEventName = keyof DesktopEventMap;
