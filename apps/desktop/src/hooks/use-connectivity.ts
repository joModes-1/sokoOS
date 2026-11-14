import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { getHealth, type HealthResponse } from '@/lib/health';

export interface Connectivity {
  /** A health request is currently in flight. */
  isChecking: boolean;
  /** The last health request succeeded — the app can reach the backend. */
  isOnline: boolean;
  health: HealthResponse | null;
  error: string | null;
  lastCheckedAt: number | null;
  refetch: () => void;
}

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Cannot reach the SokoOS server.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

/**
 * Tracks honest backend connectivity. This is intentionally an unauthenticated
 * /v1/health probe — no auth or financial code runs in Phase 1.
 */
export function useConnectivity(): Connectivity {
  const query = useQuery({
    queryKey: ['backend-health'],
    queryFn: getHealth,
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return {
    isChecking: query.isFetching,
    isOnline: query.isSuccess,
    health: query.data ?? null,
    error: query.isError ? friendlyError(query.error) : null,
    lastCheckedAt: query.dataUpdatedAt || null,
    refetch: () => {
      void query.refetch();
    },
  };
}
