/**
 * Compare view — runs the same query through 2-3 canonical engines.
 * Engine availability is read from the live /strategies endpoint so a
 * disabled engine (e.g. GraphRAG when Neo4j is offline) is visibly excluded.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import CompareResultCard from './CompareResultCard';
import { api } from '@/lib/api';
import { DEFAULT_QUERY_PARAMS, STRATEGIES } from '@/lib/constants';
import { withAlpha } from '@/lib/utils';
import type {
  CanonicalRAGStrategy,
  CompareResult,
  StrategyInfo,
} from '@/types/api';

const CANONICAL_IDS: CanonicalRAGStrategy[] = ['lightrag', 'agentic', 'graph'];

export default function CompareView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompareResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liveStrategies, setLiveStrategies] = useState<StrategyInfo[] | null>(null);
  const [selected, setSelected] = useState<Set<CanonicalRAGStrategy>>(
    new Set(['lightrag', 'agentic']),
  );

  // Pull live availability so disabled engines are excluded.
  useEffect(() => {
    let cancelled = false;
    api.getStrategies()
      .then((res) => {
        if (cancelled) return;
        setLiveStrategies(res.strategies);
        // Drop any pre-selected engine that is now unavailable
        setSelected((prev) => {
          const allowed = new Set(
            res.strategies.filter((s) => s.available !== false).map((s) => s.id),
          );
          const next = new Set<CanonicalRAGStrategy>();
          prev.forEach((id) => {
            if (allowed.has(id)) next.add(id);
          });
          // Always keep at least lightrag if nothing left
          if (next.size === 0 && allowed.has('lightrag')) {
            next.add('lightrag');
          }
          return next;
        });
      })
      .catch(() => {
        // Fall back to local catalog if /strategies is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isAvailable = useCallback(
    (id: CanonicalRAGStrategy): boolean => {
      if (!liveStrategies) return true;
      const info = liveStrategies.find((s) => s.id === id);
      return info ? info.available !== false : true;
    },
    [liveStrategies],
  );

  const unavailableReason = useCallback(
    (id: CanonicalRAGStrategy): string | undefined => {
      if (!liveStrategies) return undefined;
      const info = liveStrategies.find((s) => s.id === id);
      return info?.unavailable_reason ?? undefined;
    },
    [liveStrategies],
  );

  const toggle = useCallback(
    (id: CanonicalRAGStrategy) => {
      if (!isAvailable(id)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          // Keep at least 2 strategies — minimum required by the API
          if (next.size <= 2) return prev;
          next.delete(id);
        } else {
          if (next.size >= 3) return prev;
          next.add(id);
        }
        return next;
      });
    },
    [isAvailable],
  );

  const orderedSelection = useMemo(
    () => CANONICAL_IDS.filter((id) => selected.has(id)),
    [selected],
  );

  const canCompare = orderedSelection.length >= 2 && !loading && query.trim().length > 0;

  const handleCompare = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || orderedSelection.length < 2) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await api.compare({
        query: trimmed,
        strategies: orderedSelection,
        collection: DEFAULT_QUERY_PARAMS.collection,
        top_k: DEFAULT_QUERY_PARAMS.top_k,
        temperature: DEFAULT_QUERY_PARAMS.temperature,
      });
      setResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }, [query, orderedSelection]);

  return (
    <div>
      <div className="bg-serpent-surface border border-serpent-border-light rounded-[14px] p-5 mb-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {STRATEGIES.map((strategy) => {
            const id = strategy.id as CanonicalRAGStrategy;
            const available = isAvailable(id);
            const checked = selected.has(id);
            const disabledTitle = !available ? unavailableReason(id) : undefined;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                disabled={!available}
                title={disabledTitle}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-dm-sans transition-opacity"
                style={{
                  background: withAlpha(strategy.color, available ? 0.05 : 0.02),
                  border: `1px solid ${withAlpha(strategy.color, checked ? 0.55 : 0.2)}`,
                  color: available ? strategy.color : '#666',
                  cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.5,
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-[3px] flex items-center justify-center"
                  style={{
                    border: `1.5px solid ${strategy.color}`,
                    background: checked ? strategy.color : 'transparent',
                  }}
                >
                  {checked && (
                    <span className="text-[8px] font-bold text-[#0a0a0a]">
                      {'✓'}
                    </span>
                  )}
                </div>
                <span>{strategy.icon}</span>
                <span className="font-medium">{strategy.name}</span>
                {!available && (
                  <span className="ml-1 text-[9px] uppercase tracking-wide text-serpent-text-dim">
                    offline
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mb-4 text-[11px] text-serpent-text-dim font-dm-sans">
          Pick 2 or 3 engines and run the same query against each. Disabled engines
          are unavailable on this deployment (for example, GraphRAG requires Neo4j).
        </p>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canCompare && handleCompare()}
            placeholder="Enter a query to compare engines..."
            className="flex-1 px-3.5 py-2.5 text-[12.5px] bg-serpent-bg border border-serpent-border rounded-lg text-serpent-text-secondary font-dm-sans placeholder:text-serpent-text-dark"
          />
          <button
            onClick={handleCompare}
            disabled={!canCompare}
            className="px-6 py-2.5 text-[11px] bg-gradient-to-br from-strategy-lightrag to-strategy-graph text-[#0a0a0a] border-none rounded-lg font-semibold cursor-pointer font-outfit transition-opacity duration-200 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Comparing...'
              : `Compare ${orderedSelection.length} engine${orderedSelection.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-[14px] p-4 mb-5">
          <p className="text-[12px] text-red-400 font-dm-sans">{error}</p>
        </div>
      )}

      {loading && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${orderedSelection.length}, 1fr)`,
          }}
        >
          {orderedSelection.map((strategyId) => {
            const meta = STRATEGIES.find((strategy) => strategy.id === strategyId);
            return (
              <div
                key={strategyId}
                className="rounded-[14px] h-[300px] animate-pulse"
                style={{
                  background: '#0b0b0b',
                  border: `1px solid ${withAlpha(meta?.color ?? '#888', 0.1)}`,
                }}
              >
                <div
                  className="h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${meta?.color ?? '#888'}40, transparent)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {results && !loading && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${results.length}, 1fr)`,
          }}
        >
          {results.map((result, index) => (
            <CompareResultCard key={result.strategy} result={result} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
