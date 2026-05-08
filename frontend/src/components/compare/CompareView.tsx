/**
 * Compare view focused on the two canonical engines.
 */

import { useCallback, useState } from 'react';
import CompareResultCard from './CompareResultCard';
import { api } from '@/lib/api';
import { DEFAULT_QUERY_PARAMS, STRATEGIES } from '@/lib/constants';
import { withAlpha } from '@/lib/utils';
import type { CanonicalRAGStrategy, CompareResult } from '@/types/api';

const COMPARISON_STRATEGIES: CanonicalRAGStrategy[] = ['lightrag', 'graph'];

export default function CompareView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompareResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await api.compare({
        query: trimmed,
        strategies: COMPARISON_STRATEGIES,
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
  }, [query]);

  return (
    <div>
      <div className="bg-serpent-surface border border-serpent-border-light rounded-[14px] p-5 mb-5">
        <div className="flex gap-2 mb-4">
          {STRATEGIES.map((strategy) => (
            <div
              key={strategy.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-dm-sans"
              style={{
                background: withAlpha(strategy.color, 0.05),
                border: `1px solid ${withAlpha(strategy.color, 0.25)}`,
                color: strategy.color,
              }}
            >
              <div
                className="w-3.5 h-3.5 rounded-[3px] flex items-center justify-center"
                style={{
                  border: `1.5px solid ${strategy.color}`,
                  background: strategy.color,
                }}
              >
                <span className="text-[8px] font-bold text-[#0a0a0a]">
                  {'\u2713'}
                </span>
              </div>
              <span>{strategy.icon}</span>
              <span className="font-medium">{strategy.name}</span>
            </div>
          ))}
        </div>

        <p className="mb-4 text-[11px] text-serpent-text-dim font-dm-sans">
          Compare the two product engines only: LightRAG for fast mixed-document
          retrieval and GraphRAG for relationship-centric reasoning.
        </p>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
            placeholder="Enter a query to compare LightRAG and GraphRAG..."
            className="flex-1 px-3.5 py-2.5 text-[12.5px] bg-serpent-bg border border-serpent-border rounded-lg text-serpent-text-secondary font-dm-sans placeholder:text-serpent-text-dark"
          />
          <button
            onClick={handleCompare}
            disabled={!query.trim() || loading}
            className="px-6 py-2.5 text-[11px] bg-gradient-to-br from-strategy-lightrag to-strategy-graph text-[#0a0a0a] border-none rounded-lg font-semibold cursor-pointer font-outfit transition-opacity duration-200 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Comparing...' : 'Compare Engines'}
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
            gridTemplateColumns: `repeat(${COMPARISON_STRATEGIES.length}, 1fr)`,
          }}
        >
          {COMPARISON_STRATEGIES.map((strategyId) => {
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
