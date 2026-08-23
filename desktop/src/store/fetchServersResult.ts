import type { PaginatedResponse, SearchResponse, ServerStatus } from '../types/server.ts';

export type ServerFetchResult =
  | { type: 'search'; data: SearchResponse }
  | { type: 'category'; data: PaginatedResponse<ServerStatus> }
  | { type: 'default'; data: ServerStatus[] | PaginatedResponse<ServerStatus> };

export interface ServerFetchPageInfo {
  resultPage: number;
  resultTotalPages: number;
}

export interface ServerFetchStorePayload {
  servers: ServerStatus[];
  total: number;
  page: number;
  totalPages: number;
}

export function getServerFetchPageInfo(
  result: ServerFetchResult,
  fallbackPage: number,
): ServerFetchPageInfo {
  if (result.type === 'search' || result.type === 'category') {
    return {
      resultPage: result.data.page || fallbackPage,
      resultTotalPages: result.data.total_pages || 0,
    };
  }
  if (Array.isArray(result.data)) {
    return { resultPage: 1, resultTotalPages: 1 };
  }
  return {
    resultPage: result.data.page || fallbackPage,
    resultTotalPages: result.data.total_pages || 0,
  };
}

export function toServerFetchStorePayload(
  result: ServerFetchResult,
  fallbackPage: number,
): ServerFetchStorePayload {
  if (result.type === 'search') {
    const data = result.data;
    return {
      servers: data.servers || [],
      total: data.count || 0,
      page: data.page || fallbackPage,
      totalPages: data.total_pages || 0,
    };
  }
  if (result.type === 'category') {
    const data = result.data;
    return {
      servers: data.servers || [],
      total: data.total || 0,
      page: data.page || fallbackPage,
      totalPages: data.total_pages || 0,
    };
  }
  if (Array.isArray(result.data)) {
    return {
      servers: result.data,
      total: result.data.length,
      page: 1,
      totalPages: 1,
    };
  }
  return {
    servers: result.data.servers || [],
    total: result.data.total || 0,
    page: result.data.page || fallbackPage,
    totalPages: result.data.total_pages || 0,
  };
}

