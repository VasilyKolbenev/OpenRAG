import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { STRATEGIES } from '@/lib/constants';

interface DashboardStats {
  documentsCount: number;
  collectionsCount: number;
  strategiesCount: number;
}

const TIPS = [
  'Upload PDF, DOCX, or TXT files to build your knowledge base.',
  'Use Compare mode to evaluate multiple strategies on the same query.',
  'Graph RAG works best with entity-rich documents like legal or medical texts.',
  'The RAG Debugger lets you inspect every step of the retrieval pipeline.',
  'MemoRAG builds a global memory of your collection for better holistic answers.',
  'Corrective RAG grades each retrieved document and can fall back to web search.',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const healthStatus = useAppStore((s) => s.healthStatus);

  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    collectionsCount: 0,
    strategiesCount: STRATEGIES.length,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [collections, documents] = await Promise.allSettled([
          api.getCollections(),
          api.listDocuments(),
        ]);

        if (cancelled) return;

        setStats({
          collectionsCount:
            collections.status === 'fulfilled' ? collections.value.collections.length : 0,
          documentsCount:
            documents.status === 'fulfilled' ? documents.value.total : 0,
          strategiesCount: STRATEGIES.length,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const healthColor =
    healthStatus === 'healthy'
      ? '#10b981'
      : healthStatus === 'degraded'
        ? '#f59e0b'
        : '#ef4444';

  const healthLabel =
    healthStatus === 'healthy'
      ? 'All systems operational'
      : healthStatus === 'degraded'
        ? 'Partial degradation'
        : 'Services offline';

  return (
    <div className="mx-auto max-w-6xl py-8">
      {/* Welcome */}
      <section className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-serpent-text">
          Your Document Workspace
        </h1>
        <p className="mt-2 text-base text-serpent-text-muted">
          Upload documents, ask questions, and compare retrieval strategies — all in one place.
        </p>
      </section>

      {/* Stats */}
      <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Documents Indexed"
          value={loading ? '...' : String(stats.documentsCount)}
        />
        <StatCard
          label="Collections"
          value={loading ? '...' : String(stats.collectionsCount)}
        />
        <StatCard
          label="System Status"
          value={healthLabel}
          dotColor={healthColor}
        />
        <StatCard
          label="Strategies Available"
          value={String(stats.strategiesCount)}
        />
      </section>

      {/* Quick Actions */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-medium text-serpent-text-secondary">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="Upload Documents" onClick={() => navigate('/documents')} />
          <ActionButton label="Ask Your Documents" onClick={() => navigate('/chat')} primary />
          <ActionButton label="Compare Strategies" onClick={() => navigate('/compare')} />
        </div>
      </section>

      {/* Strategy Overview */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-medium text-serpent-text-secondary">
          Available Strategies
        </h2>
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 rounded-lg border border-serpent-border-light bg-serpent-surface px-3 py-2 text-sm text-serpent-text transition-colors hover:border-serpent-border-hover hover:bg-serpent-surface-hover"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}</span>
              <span className="ml-1 text-xs text-serpent-text-dim">
                {s.latency}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-serpent-text-secondary">
          Getting Started
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="rounded-xl border border-serpent-border-light bg-serpent-surface p-4 text-sm leading-relaxed text-serpent-text-tertiary"
            >
              {tip}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────── */

function StatCard({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: string;
  dotColor?: string;
}) {
  return (
    <div className="rounded-xl border border-serpent-border-light bg-serpent-surface p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-serpent-text-dim">
        {label}
      </p>
      <p className="flex items-center gap-2 text-xl font-semibold text-serpent-text">
        {dotColor && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        )}
        {value}
      </p>
    </div>
  );
}

/* ── Action Button ─────────────────────────────────── */

function ActionButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors ${
        primary
          ? 'border-[#00d4ff] bg-[#00d4ff] text-[#0f1117] hover:bg-[#00bfe6]'
          : 'border-serpent-border-light bg-serpent-surface text-serpent-text hover:border-serpent-border-hover hover:bg-serpent-surface-hover'
      }`}
    >
      {label}
    </button>
  );
}
