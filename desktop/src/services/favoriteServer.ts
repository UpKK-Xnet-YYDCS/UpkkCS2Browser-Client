import type { FavoriteServer } from '@/api';
import type { ServerStatus } from '@/types';

export function favoriteToServerStatus(favorite: FavoriteServer): ServerStatus {
  return {
    name: favorite.current_name || favorite.server_name || '',
    ip: favorite.server_ip,
    port: favorite.server_port,
    game: favorite.game || '',
    region: '',
    mode: '',
    players: favorite.players ?? favorite.current_players ?? 0,
    max_players: favorite.max_players ?? 0,
    bots: favorite.bots ?? 0,
    real_players: favorite.real_players ?? favorite.players ?? favorite.current_players ?? 0,
    map_name: favorite.map_name || '',
    comments: '',
    display_address: favorite.server_ip,
    mapnamecn: '',
    map_image_url: favorite.map_image_url,
    category: favorite.category || '',
    priority: favorite.priority ?? 0,
    config_order: 0,
    admin_sort_priority: 0,
    submitter_uid: 0,
    country_code: favorite.country_code || '',
    country_name: favorite.country_name || '',
    continent: '',
    geo_region: '',
    server_type: '',
    environment: '',
    vac: false,
    password: false,
    version: '',
    game_id: 0,
    last_updated: favorite.last_updated || '',
    Online: favorite.online ?? favorite.is_online ?? false,
  };
}
