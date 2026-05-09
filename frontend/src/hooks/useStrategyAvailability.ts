/**
 * Live engine availability — polls /strategies so disabled engines (e.g.
 * GraphRAG when Neo4j is offline) render as disabled instead of crashing
 * the user mid-query.
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CanonicalRAGStrategy, StrategyInfo } from '@/types/api';

const REFRESH_MS = 30_000;

interface AvailabilityHookResult {
  strategies: StrategyInfo[] | null;
  isAvailable: (id: CanonicalRAGStrategy) => boolean;
  unavailableReason: (id: CanonicalRAGStrategy) => string | undefined;
  refresh: () => void;
}

export function useStrategyAvailability(): AvailabilityHookResult {
  const [strategies, setStrategies] = useState<StrategyInfo[] | null>(null);

  const refresh = useCallback(() => {
    api
      .getStrategies()
      .then((res) => setStrategies(res.strategies))
      .catch(() => {
        // Network glitch — keep stale data and let the next poll heal it.
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const isAvailable = useCallback(
    (id: CanonicalRAGStrategy): boolean => {
      if (!strategies) return true; // Optimistic until first response.
      const info = strategies.find((s) => s.id === id);
      return info ? info.available !== false : true;
    },
    [strategies],
  );

  const unavailableReason = useCallback(
    (id: CanonicalRAGStrategy): string | undefined => {
      if (!strategies) return undefined;
      return strategies.find((s) => s.id === id)?.unavailable_reason ?? undefined;
    },
    [strategies],
  );

  return { strategies, isAvailable, unavailableReason, refresh };
}
