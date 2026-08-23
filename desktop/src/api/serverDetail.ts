import type { ServerDetail } from '@/types';
import { fetchApi } from './client';

export const getServerDetail = async (id: number | string): Promise<ServerDetail> => {
  return fetchApi(`/api/server/${id}/info`);
};

export const getServerPlayers = async (id: number | string) => {
  return fetchApi(`/api/server/${id}/players`);
};

export const getServerStats = async (id: number | string) => {
  return fetchApi(`/api/server/${id}/stats`);
};

export const refreshServer = async (id: number | string) => {
  return fetchApi(`/api/server/${id}/refresh`, { method: 'POST' });
};
