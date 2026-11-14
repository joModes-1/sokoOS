/**
 * Backend health probe — the Phase 1 proof that the desktop app can reach the
 * existing SokoOS API online. Mirrors GET /v1/health in apps/api/src/health/health.controller.ts.
 */
import { api } from '@/lib/api-client';

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>('/health');
}
