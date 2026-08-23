export function buildQuery(params: Record<string, string | number | undefined>): string {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
  return filtered.length ? '?' + filtered.join('&') : '';
}

export interface GeoFilterParams {
  continent?: string;
  geo_region?: string;
  country?: string;
}
