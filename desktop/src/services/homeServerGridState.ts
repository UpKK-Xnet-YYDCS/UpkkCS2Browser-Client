export function shouldShowHomeGridSkeleton(input: {
  isLoading: boolean;
  serversLength: number;
  showFavoritesOnly: boolean;
  favLoading: boolean;
  favServersLength: number;
}): boolean {
  return (input.isLoading && input.serversLength === 0 && !input.showFavoritesOnly)
    || (input.favLoading && input.favServersLength === 0 && input.showFavoritesOnly);
}

export function shouldShowHomeNoServers(input: {
  isLoading: boolean;
  serversLength: number;
  error: string | null;
}): boolean {
  return !input.isLoading && input.serversLength === 0 && !input.error;
}

export function shouldShowHomeNoFavorites(input: {
  favLoading: boolean;
  showFavoritesOnly: boolean;
  filteredFavLength: number;
}): boolean {
  return !input.favLoading && input.showFavoritesOnly && input.filteredFavLength === 0;
}

export function shouldShowHomeLatencyEmpty(input: {
  isLoading: boolean;
  favLoading: boolean;
  latencyFilter: string;
  displayedLength: number;
  displayedWithLatencyLength: number;
}): boolean {
  return !input.isLoading
    && !input.favLoading
    && input.latencyFilter !== 'all'
    && input.displayedLength > 0
    && input.displayedWithLatencyLength === 0;
}

export function homeFavoriteGlobalIndex(favPage: number, perPage: number, index: number): number {
  return (favPage - 1) * perPage + index;
}

