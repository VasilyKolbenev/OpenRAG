/**
 * Intelligence Page — Full-page AI Strategy Advisor + Strategy Catalog.
 * Central UX for the Intelligence primitive.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdvisorStore } from '@/stores/advisorStore';
import { useAppStore } from '@/stores/appStore';
import { STRATEGIES, STRATEGY_COLORS } from '@/lib/constants';
import type { RAGStrategy, AdvisorRecommendation } from '@/types/api';

export default function IntelligencePage() {
  const navigate = useNavigate();
  const setSelectedStrategy = useAppStore((s) => s.setSelectedStrategy);

  return (
    <div className="mx-auto max-w-6xl py-6">
      {/* Header */}
      <section className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{'\uD83E\uDDE0'}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-serpent-text">
              Intelligence
            </h1>
            <p className="text-sm text-serpent-text-muted">
              AI-powered strategy advisor and RAG catalog
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Advisor Chat (3 cols) */}
        <div className="lg:col-span-3">
          <AdvisorPanel />
        </div>

        {/* Right: Strategy Catalog (2 cols) */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-serpent-text-secondary uppercase tracking-wider mb-3">
            Strategy Catalog
          </h2>
          <div className="space-y-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStrategy(s.id as RAGStrategy);
                  navigate('/chat');
                }}
                className="w-full text-left rounded-lg border border-serpent-border-light bg-serpent-surface p-3 transition-all hover:border-serpent-border-hover hover:bg-serpent-surface-hover group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{s.icon}</span>
                  <span className="text-sm font-medium" style={{ color: s.color }}>
                    {s.name}
                  </span>
                  <span className="ml-auto text-[10px] text-serpent-text-dim">{s.latency}</span>
                </div>
                <p className="text-xs text-serpent-text-tertiary leading-relaxed line-clamp-2">
                  {s.desc}
                </p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {s.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-serpent-surface-active text-serpent-text-dim"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Providers */}
      <ModelProviders />
    </div>
  );
}

/* ── Model Providers Section ─────────────────────── */

interface ProviderInfo {
  name: string;
  emoji: string;
  type: 'Cloud' | 'Self-hosted';
  status: string;
  statusColor: string;
  dotColor: string;
  models: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: 'OpenAI',
    emoji: '\u2B50',
    type: 'Cloud',
    status: 'Connected',
    statusColor: 'text-green-400',
    dotColor: '#22c55e',
    models: ['GPT-5.4', 'GPT-5.4-mini'],
  },
  {
    name: 'Anthropic',
    emoji: '\uD83E\uDDE1',
    type: 'Cloud',
    status: 'API Key Required',
    statusColor: 'text-yellow-400',
    dotColor: '#eab308',
    models: ['Claude 4.5 Sonnet', 'Claude 4.5 Haiku'],
  },
  {
    name: 'Ollama',
    emoji: '\uD83E\uDD99',
    type: 'Self-hosted',
    status: 'Configure Endpoint',
    statusColor: 'text-zinc-400',
    dotColor: '#71717a',
    models: ['Llama 3.2', 'Mistral', 'Qwen'],
  },
  {
    name: 'vLLM / SGLang',
    emoji: '\u26A1',
    type: 'Self-hosted',
    status: 'Configure Endpoint',
    statusColor: 'text-zinc-400',
    dotColor: '#71717a',
    models: ['Any HuggingFace model'],
  },
];

function ModelProviders() {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-serpent-text-secondary uppercase tracking-wider mb-4">
        Model Providers
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PROVIDERS.map((p) => (
          <div
            key={p.name}
            className="rounded-xl border border-serpent-border-light bg-serpent-surface p-4 flex flex-col gap-3"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{p.emoji}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-serpent-text truncate">
                  {p.name}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-serpent-surface-active text-serpent-text-dim">
                  {p.type}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.dotColor }}
              />
              <span className={`text-xs font-medium ${p.statusColor}`}>
                {p.status}
              </span>
            </div>

            {/* Models */}
            <div className="flex flex-wrap gap-1">
              {p.models.map((m) => (
                <span
                  key={m}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-serpent-border-light text-serpent-text-dim"
                >
                  {m}
                </span>
              ))}
            </div>

            {/* Configure Button */}
            <button
              disabled
              className="mt-auto text-xs font-medium px-3 py-1.5 rounded-md border border-serpent-border-light text-serpent-text-dim opacity-40 cursor-not-allowed"
            >
              Configure
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Full-Page Advisor Panel ──────────────────────── */

function AdvisorPanel() {
  const {
    messages,
    recommendation,
    isLoading,
    error,
    sendMessage,
    reset,
  } = useAdvisorStore();

  const navigate = useNavigate();
  const setSelectedStrategy = useAppStore((s) => s.setSelectedStrategy);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applyRecommendation = (rec: AdvisorRecommendation) => {
    setSelectedStrategy(rec.recommended as RAGStrategy);
    navigate('/chat');
  };

  return (
    <div className="rounded-xl border border-serpent-border-light bg-serpent-surface flex flex-col" style={{ minHeight: 500 }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-serpent-border-light flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'\u2728'}</span>
          <div>
            <h3 className="text-sm font-semibold text-serpent-text">AI Strategy Advisor</h3>
            <p className="text-xs text-serpent-text-muted">
              Describe your use case — I'll recommend the best RAG strategy
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="text-xs text-serpent-text-dim hover:text-serpent-text-tertiary transition-colors px-2 py-1 rounded border border-serpent-border-light hover:bg-serpent-surface-hover"
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-serpent-text-dim text-sm mt-12 space-y-2">
            <p className="text-3xl mb-3">{'\uD83E\uDDE0'}</p>
            <p className="text-serpent-text-tertiary font-medium">Tell me about your documents</p>
            <p className="text-xs text-serpent-text-dim max-w-xs mx-auto">
              What domain? How complex are your queries? I'll analyze your needs and recommend the optimal RAG strategy.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                'I have legal contracts to analyze',
                'Technical documentation Q&A',
                'Research papers search',
                'Customer support knowledge base',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-serpent-border-light text-serpent-text-tertiary hover:bg-serpent-surface-hover transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#C8F547]/15 text-serpent-text'
                  : 'bg-serpent-surface-hover text-serpent-text-secondary'
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-serpent-surface-hover px-4 py-2.5 rounded-xl">
              <span className="text-serpent-text-dim text-sm animate-pulse">
                Analyzing your requirements...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-xs text-center py-2">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Recommendation Card */}
      {recommendation && (
        <div className="mx-5 mb-3 p-4 rounded-xl border border-serpent-border-light bg-gradient-to-r from-serpent-surface-hover to-serpent-surface">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-serpent-text-muted">Recommended Strategy:</span>
              <span
                className="text-sm font-bold uppercase"
                style={{ color: STRATEGY_COLORS[recommendation.recommended as RAGStrategy] ?? '#C8F547' }}
              >
                {recommendation.recommended}
              </span>
            </div>
            <button
              onClick={() => applyRecommendation(recommendation)}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#C8F547] text-[#0f1117] hover:bg-[#b8e03e] transition-colors"
            >
              Use This Strategy →
            </button>
          </div>
          {recommendation.reasoning && (
            <p className="text-xs text-serpent-text-tertiary leading-relaxed">
              {recommendation.reasoning}
            </p>
          )}
          {Object.keys(recommendation.scores).length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {Object.entries(recommendation.scores)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, score]) => (
                  <span
                    key={name}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-serpent-surface-active text-serpent-text-dim"
                  >
                    {name}: {(score * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-serpent-border-light">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your documents and use case..."
            className="flex-1 bg-serpent-bg border border-serpent-border rounded-lg px-4 py-2.5 text-sm text-serpent-text placeholder-serpent-text-dim focus:outline-none focus:border-[#C8F547]/40"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 bg-[#C8F547] text-[#0f1117] rounded-lg text-sm font-medium hover:bg-[#b8e03e] disabled:opacity-30 transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Message Content ──────────────────────────────── */

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold" style={{ color: '#C8F547' }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
