const API_BASE_URL = 'https://servers.upkk.com';
export const DEFAULT_MAP_IMAGE = `${API_BASE_URL}/mapimage/default_1.webp`;

export function getMapImageUrl(mapName: string, mapImageUrl?: string): string {
  if (mapImageUrl) {
    return mapImageUrl.startsWith('/') ? `${API_BASE_URL}${mapImageUrl}.webp` : mapImageUrl;
  }
  return mapName
    ? `${API_BASE_URL}/mapimage/${encodeURIComponent(mapName)}.webp`
    : DEFAULT_MAP_IMAGE;
}
