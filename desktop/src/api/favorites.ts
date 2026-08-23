import { mapWithConcurrency } from '@/services/concurrency';
import { buildQuery, fetchApi, fetchWithRetry } from './client';

export interface FavoriteServer {
  id: number;
  server_ip: string;
  server_port: string;
  server_name: string;
  added_at: string;
  notes?: string;
  sort_order?: number;
  // Extended fields from server status
  current_name?: string;
  players?: number;
  current_players?: number;
  max_players?: number;
  real_players?: number;
  bots?: number;
  map_name?: string;
  map_image_url?: string;  // Map preview image URL
  game?: string;
  category?: string;
  is_online?: boolean;
  online?: boolean;
  country_code?: string;
  country_name?: string;
  priority?: number;
  last_updated?: string;
}

export interface FavoriteListResponse {
  success?: boolean;
  favorites: FavoriteServer[];
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

// Get user's favorite servers list with optional pagination
export const getFavorites = async (page?: number, perPage?: number): Promise<FavoriteListResponse> => {
  const query = buildQuery({ page, per_page: perPage });
  return fetchWithRetry(`/api/favorites/list${query}`);
};

// Fetch ALL favorites using server-side pagination to avoid truncation
// Accumulates results across pages; returns total from the API
export const getAllFavorites = async (perPage = 100): Promise<FavoriteListResponse> => {
  const firstPage = await getFavorites(1, perPage);
  const total = firstPage.total;
  const totalPages = firstPage.total_pages ?? Math.ceil(total / perPage);

  if (totalPages <= 1) {
    return firstPage;
  }

  // Fetch remaining pages in parallel
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const pages = await mapWithConcurrency(remainingPages, 4, page => getFavorites(page, perPage));

  const allFavorites = [
    ...firstPage.favorites,
    ...pages.flatMap(p => p.favorites),
  ];

  return { success: true, favorites: allFavorites, total, page: 1, per_page: perPage, total_pages: 1 };
};

// Add server to favorites
export const addFavorite = async (
  serverIp: string,
  serverPort: string,
  serverName: string,
  notes?: string
): Promise<{ success: boolean; message?: string }> => {
  return fetchApi('/api/favorites/add', {
    method: 'POST',
    body: JSON.stringify({
      server_ip: serverIp,
      server_port: serverPort,
      server_name: serverName,
      notes: notes || '',
    }),
  });
};

// Remove server from favorites
export const removeFavorite = async (
  serverIp: string,
  serverPort: string
): Promise<{ success: boolean; message?: string }> => {
  return fetchApi('/api/favorites/remove', {
    method: 'POST',
    body: JSON.stringify({
      server_ip: serverIp,
      server_port: serverPort,
    }),
  });
};

// Check if a server is favorited
export const checkFavorite = async (
  serverIp: string,
  serverPort: string
): Promise<{ is_favorite: boolean }> => {
  const query = buildQuery({ ip: serverIp, port: serverPort });
  return fetchApi(`/api/favorites/check${query}`);
};

// Update sort order of favorites
export const updateFavoriteSortOrder = async (
  orders: Array<{ server_ip: string; server_port: string; sort_order: number }>
): Promise<{ success: boolean; message?: string }> => {
  return fetchApi('/api/favorites/sort-order', {
    method: 'POST',
    body: JSON.stringify(orders),
  });
};

