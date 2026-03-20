/**
 * Dashboard — Command Center showing 5-primitive architecture.
 * Intelligence / Engine / Agents / Tools & Memory / Learning.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { STRATEGIES } from '@/lib/constants';
import type { RAGStrategy } from '@/types/api';

interface DashboardStats {
  documentsCount: number;
  collectionsCount: number;
  tracesCount: number;
}

/* ── Primitive Definitions ────────────────────────── */

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
  const healthStatus = useAppStore((s) => s.healthStatus);
  const setSelectedStrategy = useAppStore((s) => s.setSelectedStrategy);

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
            collections.status === 'fulfilled' ? collections.value.collections.length : 0,
          documentsCount:
            documents.status === 'fulfilled' ? documents.value.total : 0,
          tracesCount: 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const serviceCount = healthStatus === 'healthy' ? 4 : healthStatus === 'degraded' ? 3 : 0;

  const primitives: PrimitiveCard[] = [
    {
      id: 'intelligence',
      name: 'Intelligence',
      icon: '\uD83E\uDDE0',
      color: '#C8F547',
      gradient: 'from-[#C8F547]/10 to-[#C8F547]/5',
      description: 'RAG strategy catalog with auto-recommendation. 6 strategies from simple vector search to autonomous multi-step reasoning.',
      stats: [
        { label: 'Strategies', value: String(STRATEGIES.length) },
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
      description: 'RAG runtime — embeddings, vector store, LLM inference. Auto-detects hardware and recommends optimal configuration.',
      stats: [
        { label: 'Embedding', value: 'MiniLM-L6-v2' },
        { label: 'Services', value: `${serviceCount}/4 online` },
      ],
    },
    {
      id: 'agents',
      name: 'Agents',
      icon: '\uD83E\uDD16',
      color: '#8B5CF6',
      gradient: 'from-[#8B5CF6]/10 to-[#8B5CF6]/5',
      description: 'Background workers for document ingestion, indexing, and pipeline orchestration. Automated document processing.',
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
      description: 'MCP integration, CLI tools, semantic document memory. Connect from Claude Desktop, terminal, or any MCP client.',
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
      description: 'Trace-based quality learning. Every query generates a pipeline trace — analyze, compare, and optimize your RAG pipeline.',
      stats: [
        { label: 'Pipeline Traces', value: 'Active' },
        { label: 'Debugger', value: 'Real-time' },
      ],
      action: { label: 'View Traces', path: '/debugger' },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl py-6">
      {/* Hero */}
      <section className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-serpent-text">
          Command Center
        </h1>
        <p className="mt-1.5 text-sm text-serpent-text-muted">
          5-primitive architecture for intelligent document processing
        </p>
      </section>

      {/* 5 Primitive Cards */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {primitives.map((p) => (
          <div
            key={p.id}
            className={`group rounded-xl border border-serpent-border-light bg-gradient-to-br ${p.gradient} p-5 transition-all hover:border-serpent-border-hover hover:shadow-lg cursor-default`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: p.color }}>
                  {p.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-serpent-text-tertiary leading-relaxed mb-4">
              {p.description}
            </p>

            {/* Stats */}
            <div className="flex gap-4 mb-4">
              {p.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] uppercase tracking-wider text-serpent-text-dim">{s.label}</p>
                  <p className="text-sm font-medium text-serpent-text">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Action */}
            {p.action && (
              <button
                onClick={() => navigate(p.action!.path)}
                className="text-xs font-medium px-3 py-1.5 rounded-md border transition-colors"
                style={{
                  color: p.color,
                  borderColor: `${p.color}30`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${p.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {p.action.label} →
              </button>
            )}
          </div>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-serpent-text-secondary uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="Ask Your Documents" onClick={() => navigate('/chat')} primary />
          <ActionButton label="Upload Documents" onClick={() => navigate('/documents')} />
          <ActionButton label="Compare Strategies" onClick={() => navigate('/compare')} />
          <ActionButton label="AI Strategy Advisor" onClick={() => navigate('/intelligence')} />
        </div>
      </section>

      {/* Strategy Quick Select */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-serpent-text-secondary uppercase tracking-wider">
          Strategies — click to start a chat
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStrategy(s.id as RAGStrategy);
                navigate('/chat');
              }}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-serpent-border-light bg-serpent-surface p-3 text-center transition-all hover:border-serpent-border-hover hover:bg-serpent-surface-hover"
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs font-medium text-serpent-text">{s.name}</span>
              <span className="text-[10px] text-serpent-text-dim">{s.latency}</span>
            </button>
          ))}
        </div>
      </section>
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
