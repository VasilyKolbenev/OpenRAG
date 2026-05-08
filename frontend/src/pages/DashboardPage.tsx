/**
 * Dashboard command center.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { STRATEGIES } from '@/lib/constants';
import { useAppStore } from '@/stores/appStore';
import type { RAGStrategy } from '@/types/api';

interface DashboardStats {
  documentsCount: number;
  collectionsCount: number;
  tracesCount: number;
}

interface PrimitiveCard {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  description: string;
  stats: { label: string; value: string }[];
  action?: { label: string; path: string };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const healthStatus = useAppStore((state) => state.healthStatus);
  const setSelectedStrategy = useAppStore((state) => state.setSelectedStrategy);

  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    collectionsCount: 0,
    tracesCount: 0,
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
            collections.status === 'fulfilled'
              ? collections.value.collections.length
              : 0,
          documentsCount:
            documents.status === 'fulfilled' ? documents.value.total : 0,
          tracesCount: 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const serviceCount =
    healthStatus === 'healthy' ? 4 : healthStatus === 'degraded' ? 3 : 0;

  const primitives: PrimitiveCard[] = [
    {
      id: 'intelligence',
      name: 'Intelligence',
      icon: '\uD83E\uDDE0',
      color: '#C8F547',
      gradient: 'from-[#C8F547]/10 to-[#C8F547]/5',
      description:
        'Two-engine product surface with AI-guided selection. LightRAG covers fast mixed-document retrieval, while GraphRAG handles relationship-heavy reasoning.',
      stats: [
        { label: 'Engines', value: String(STRATEGIES.length) },
        { label: 'Auto-Select', value: 'AI Advisor' },
      ],
      action: { label: 'Open Advisor', path: '/intelligence' },
    },
    {
      id: 'engine',
      name: 'Engine',
      icon: '\u2699\uFE0F',
      color: '#38BDF8',
      gradient: 'from-[#38BDF8]/10 to-[#38BDF8]/5',
      description:
        'Production runtime for embeddings, vector search, graph traversal, and LLM inference. TurboQuant controls make the deployment profile easier to tune for latency and cost.',
      stats: [
        { label: 'Embedding', value: 'MiniLM-L6-v2' },
        { label: 'Services', value: `${serviceCount}/4 online` },
        { label: 'Quantization', value: 'TurboQuant-ready' },
      ],
    },
    {
      id: 'agents',
      name: 'Agents',
      icon: '\uD83E\uDD16',
      color: '#8B5CF6',
      gradient: 'from-[#8B5CF6]/10 to-[#8B5CF6]/5',
      description:
        'Background workers for document ingestion, indexing, and pipeline orchestration. Automated processing keeps new collections ready for querying.',
      stats: [
        { label: 'Documents', value: loading ? '...' : String(stats.documentsCount) },
        { label: 'Collections', value: loading ? '...' : String(stats.collectionsCount) },
      ],
      action: { label: 'Manage Documents', path: '/documents' },
    },
    {
      id: 'tools',
      name: 'Tools & Memory',
      icon: '\uD83D\uDD27',
      color: '#F97316',
      gradient: 'from-[#F97316]/10 to-[#F97316]/5',
      description:
        'Operational tooling around the retrieval core: MCP integration, CLI access, and ReasoningBank memory so the system can reuse retrieval lessons between tasks.',
      stats: [
        { label: 'MCP Tools', value: '6' },
        { label: 'CLI Commands', value: '8' },
      ],
    },
    {
      id: 'learning',
      name: 'Learning',
      icon: '\uD83D\uDCC8',
      color: '#2DD4A8',
      gradient: 'from-[#2DD4A8]/10 to-[#2DD4A8]/5',
      description:
        'Trace-based quality learning for the two core engines. Every query leaves a pipeline trace you can inspect, compare, and optimize.',
      stats: [
        { label: 'Pipeline Traces', value: 'Active' },
        { label: 'Debugger', value: 'Real-time' },
      ],
      action: { label: 'View Traces', path: '/debugger' },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl py-6">
      <section className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-serpent-text">
          Command Center
        </h1>
        <p className="mt-1.5 text-sm text-serpent-text-muted">
          Market-ready document intelligence built around LightRAG and GraphRAG
        </p>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {primitives.map((primitive) => (
          <div
            key={primitive.id}
            className={`group rounded-xl border border-serpent-border-light bg-gradient-to-br ${primitive.gradient} p-5 transition-all hover:border-serpent-border-hover hover:shadow-lg cursor-default`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{primitive.icon}</span>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: primitive.color }}>
                  {primitive.name}
                </h3>
              </div>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-serpent-text-tertiary">
              {primitive.description}
            </p>

            <div className="mb-4 flex gap-4">
              {primitive.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-[10px] uppercase tracking-wider text-serpent-text-dim">
                    {stat.label}
                  </p>
                  <p className="text-sm font-medium text-serpent-text">{stat.value}</p>
                </div>
              ))}
            </div>

            {primitive.action && (
              <button
                onClick={() => navigate(primitive.action!.path)}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: primitive.color,
                  borderColor: `${primitive.color}30`,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = `${primitive.color}15`;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {primitive.action.label} {'\u2192'}
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-serpent-text-secondary">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="Ask Your Documents" onClick={() => navigate('/chat')} primary />
          <ActionButton label="Upload Documents" onClick={() => navigate('/documents')} />
          <ActionButton label="Compare Engines" onClick={() => navigate('/compare')} />
          <ActionButton label="AI Engine Advisor" onClick={() => navigate('/intelligence')} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-serpent-text-secondary">
          Engines - click to start a chat
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {STRATEGIES.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => {
                setSelectedStrategy(strategy.id as RAGStrategy);
                navigate('/chat');
              }}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-serpent-border-light bg-serpent-surface p-3 text-center transition-all hover:border-serpent-border-hover hover:bg-serpent-surface-hover"
            >
              <span className="text-xl">{strategy.icon}</span>
              <span className="text-xs font-medium text-serpent-text">{strategy.name}</span>
              <span className="text-[10px] text-serpent-text-dim">{strategy.latency}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

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
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        primary
          ? 'border-[#C8F547] bg-[#C8F547] text-[#0f1117] hover:bg-[#b8e03e]'
          : 'border-serpent-border-light bg-serpent-surface text-serpent-text hover:border-serpent-border-hover hover:bg-serpent-surface-hover'
      }`}
    >
      {label}
    </button>
  );
}
