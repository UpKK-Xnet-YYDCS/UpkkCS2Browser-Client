import type { RecommendedServer } from './aiChat.ts';
import type { ServerStatus } from '@/types';

export type DesktopToolRequest =
  | { type: 'test_latency'; address: string }
  | { type: 'find_lowest_latency'; category?: string }
  | { type: 'join_server'; address?: string; targetText: string };

export interface LocalLatencyResult {
  server: RecommendedServer;
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export type JoinTargetResolution =
  | { kind: 'resolved'; server: ServerStatus }
  | { kind: 'ambiguous'; candidates: ServerStatus[] }
  | { kind: 'unresolved' };
