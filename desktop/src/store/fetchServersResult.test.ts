import assert from 'node:assert/strict';
import test from 'node:test';
import { getServerFetchPageInfo, toServerFetchStorePayload } from './fetchServersResult.ts';
import type { PaginatedResponse, SearchResponse, ServerStatus } from '../types/server.ts';

function server(name: string): ServerStatus {
  return { name } as ServerStatus;
}

function search(overrides: Partial<SearchResponse> = {}): SearchResponse {
  return {
    servers: [server('a')],
    total: 99,
    page: 2,
    per_page: 20,
    total_pages: 4,
    query: 'ze',
    region: 'all',
    count: 7,
    ...overrides,
  };
}

function page(overrides: Partial<PaginatedResponse<ServerStatus>> = {}): PaginatedResponse<ServerStatus> {
  return {
    servers: [server('b')],
    total: 11,
    page: 3,
    per_page: 20,
    total_pages: 5,
    ...overrides,
  };
}

test('search page info uses page/total_pages and falls back like the live fetch path', () => {
  assert.deepEqual(getServerFetchPageInfo({ type: 'search', data: search() }, 8), {
    resultPage: 2,
    resultTotalPages: 4,
  });
  assert.deepEqual(getServerFetchPageInfo({ type: 'search', data: search({ page: 0, total_pages: 0 }) }, 8), {
    resultPage: 8,
    resultTotalPages: 0,
  });
});

test('search store payload uses count, not the paginated total field', () => {
  assert.deepEqual(toServerFetchStorePayload({ type: 'search', data: search() }, 8), {
    servers: [server('a')],
    total: 7,
    page: 2,
    totalPages: 4,
  });
  assert.deepEqual(
    toServerFetchStorePayload({ type: 'search', data: search({ servers: undefined as unknown as ServerStatus[], count: 0, page: 0, total_pages: 0 }) }, 8),
    { servers: [], total: 0, page: 8, totalPages: 0 },
  );
});

test('category store payload uses total, not count', () => {
  assert.deepEqual(toServerFetchStorePayload({ type: 'category', data: page() }, 8), {
    servers: [server('b')],
    total: 11,
    page: 3,
    totalPages: 5,
  });
});

test('default array responses stay on a single page', () => {
  const servers = [server('c'), server('d')];
  assert.deepEqual(getServerFetchPageInfo({ type: 'default', data: servers }, 8), {
    resultPage: 1,
    resultTotalPages: 1,
  });
  assert.deepEqual(toServerFetchStorePayload({ type: 'default', data: servers }, 8), {
    servers,
    total: 2,
    page: 1,
    totalPages: 1,
  });
});

test('default paginated responses keep page metadata', () => {
  assert.deepEqual(getServerFetchPageInfo({ type: 'default', data: page() }, 8), {
    resultPage: 3,
    resultTotalPages: 5,
  });
  assert.deepEqual(toServerFetchStorePayload({ type: 'default', data: page() }, 8), {
    servers: [server('b')],
    total: 11,
    page: 3,
    totalPages: 5,
  });
});

