/**
 * Intelligence page with advisor chat and engine catalog.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STRATEGIES, STRATEGY_COLORS, STRATEGY_MAP } from '@/lib/constants';
import { useAdvisorStore } from '@/stores/advisorStore';
import { useAppStore } from '@/stores/appStore';
import type { AdvisorRecommendation, RAGStrategy } from '@/types/api';

export default function IntelligencePage() {
  const navigate = useNavigate();
  const setSelectedStrategy = useAppStore((state) => state.setSelectedStrategy);

  return (
    <div className="mx-auto max-w-6xl py-6">
      <section className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{'\uD83E\uDDE0'}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-serpent-text">
              Intelligence
            </h1>
            <p className="text-sm text-serpent-text-muted">
              AI guidance for choosing between LightRAG, AgenticRAG, and GraphRAG
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AdvisorPanel />
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-serpent-text-secondary">
            Engine Catalog
          </h2>
          <div className="space-y-2">
            {STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => {
                  setSelectedStrategy(strategy.id as RAGStrategy);
                  navigate('/chat');
                }}
                className="group w-full rounded-lg border border-serpent-border-light bg-serpent-surface p-3 text-left transition-all hover:border-serpent-border-hover hover:bg-serpent-surface-hover"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span>{strategy.icon}</span>
                  <span className="text-sm font-medium" style={{ color: strategy.color }}>
                    {strategy.name}
                  </span>
                  <span className="ml-auto text-[10px] text-serpent-text-dim">
                    {strategy.latency}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-serpent-text-tertiary">
                  {strategy.desc}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {strategy.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-serpent-surface-active px-1.5 py-0.5 text-[10px] text-serpent-text-dim"
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

      <ModelProviders />
    </div>
  );
}

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
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-serpent-text-secondary">
        Model Providers
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.name}
            className="flex flex-col gap-3 rounded-xl border border-serpent-border-light bg-serpent-surface p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{provider.emoji}</span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-serpent-text">
                  {provider.name}
                </h3>
                <span className="rounded bg-serpent-surface-active px-1.5 py-0.5 text-[10px] text-serpent-text-dim">
                  {provider.type}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: provider.dotColor }}
              />
              <span className={`text-xs font-medium ${provider.statusColor}`}>
                {provider.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {provider.models.map((model) => (
                <span
                  key={model}
                  className="rounded-full border border-serpent-border-light px-2 py-0.5 text-[10px] text-serpent-text-dim"
                >
                  {model}
                </span>
              ))}
            </div>

            <button
              disabled
              className="mt-auto cursor-not-allowed rounded-md border border-serpent-border-light px-3 py-1.5 text-xs font-medium text-serpent-text-dim opacity-40"
            >
              Configure
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdvisorPanel() {
  const { messages, recommendation, isLoading, error, sendMessage, reset } =
    useAdvisorStore();

  const navigate = useNavigate();
  const setSelectedStrategy = useAppStore((state) => state.setSelectedStrategy);
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const applyRecommendation = (rec: AdvisorRecommendation) => {
    setSelectedStrategy(rec.recommended as RAGStrategy);
    navigate('/chat');
  };

  const recommendedMeta = recommendation
    ? STRATEGY_MAP[recommendation.recommended as RAGStrategy]
    : null;

  return (
    <div
      className="flex min-h-[500px] flex-col rounded-xl border border-serpent-border-light bg-serpent-surface"
    >
      <div className="flex items-center justify-between border-b border-serpent-border-light px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'\u2728'}</span>
          <div>
            <h3 className="text-sm font-semibold text-serpent-text">
              AI Engine Advisor
            </h3>
            <p className="text-xs text-serpent-text-muted">
              Describe your use case and I&apos;ll recommend the best engine
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded border border-serpent-border-light px-2 py-1 text-xs text-serpent-text-dim transition-colors hover:bg-serpent-surface-hover hover:text-serpent-text-tertiary"
        >
          New Chat
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="mt-12 space-y-2 text-center text-sm text-serpent-text-dim">
            <p className="mb-3 text-3xl">{'\uD83E\uDDE0'}</p>
            <p className="font-medium text-serpent-text-tertiary">
              Tell me about your documents
            </p>
            <p className="mx-auto max-w-xs text-xs text-serpent-text-dim">
              Tell me about the domain, query shape, and data structure. I&apos;ll
              recommend the right engine: LightRAG, AgenticRAG, or GraphRAG.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                'I have legal contracts to analyze',
                'Technical documentation Q&A',
                'Research papers search',
                'Customer support knowledge base',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-serpent-border-light px-3 py-1.5 text-xs text-serpent-text-tertiary transition-colors hover:bg-serpent-surface-hover"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-[#C8F547]/15 text-serpent-text'
                  : 'bg-serpent-surface-hover text-serpent-text-secondary'
              }`}
            >
              <MessageContent content={message.content} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-serpent-surface-hover px-4 py-2.5">
              <span className="text-sm text-serpent-text-dim animate-pulse">
                Analyzing your requirements...
              </span>
            </div>
          </div>
        )}

        {error && <div className="py-2 text-center text-xs text-red-400">{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {recommendation && recommendedMeta && (
        <div className="mx-5 mb-3 rounded-xl border border-serpent-border-light bg-gradient-to-r from-serpent-surface-hover to-serpent-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-serpent-text-muted">
                Recommended Engine:
              </span>
              <span
                className="text-sm font-bold uppercase"
                style={{
                  color:
                    STRATEGY_COLORS[recommendation.recommended as RAGStrategy] ??
                    '#C8F547',
                }}
              >
                {recommendedMeta.name}
              </span>
            </div>
            <button
              onClick={() => applyRecommendation(recommendation)}
              className="rounded-md bg-[#C8F547] px-3 py-1.5 text-xs font-medium text-[#0f1117] transition-colors hover:bg-[#b8e03e]"
            >
              Use This Engine {'\u2192'}
            </button>
          </div>
          {recommendation.reasoning && (
            <p className="text-xs leading-relaxed text-serpent-text-tertiary">
              {recommendation.reasoning}
            </p>
          )}
          {Object.keys(recommendation.scores).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(recommendation.scores)
                .sort(([, left], [, right]) => right - left)
                .slice(0, 2)
                .map(([name, score]) => (
                  <span
                    key={name}
                    className="rounded-full bg-serpent-surface-active px-2 py-0.5 text-[10px] text-serpent-text-dim"
                  >
                    {STRATEGY_MAP[name as RAGStrategy]?.name ?? name}:{' '}
                    {(score * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-serpent-border-light px-5 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your documents and use case..."
            className="flex-1 rounded-lg border border-serpent-border bg-serpent-bg px-4 py-2.5 text-sm text-serpent-text placeholder-serpent-text-dim focus:outline-none focus:border-[#C8F547]/40"
            disabled={isLoading}
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-[#C8F547] px-5 py-2.5 text-sm font-medium text-[#0f1117] transition-all hover:bg-[#b8e03e] disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong
              key={index}
              className="font-semibold"
              style={{ color: '#C8F547' }}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
