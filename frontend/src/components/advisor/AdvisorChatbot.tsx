/**
 * Floating advisor chatbot.
 */

import { useEffect, useRef, useState } from 'react';
import { STRATEGY_COLORS, STRATEGY_MAP } from '@/lib/constants';
import { useAdvisorStore } from '@/stores/advisorStore';
import type { AdvisorRecommendation, RAGStrategy } from '@/types/api';

export function AdvisorChatbot() {
  const {
    isOpen,
    messages,
    recommendation,
    isLoading,
    error,
    toggleOpen,
    sendMessage,
    reset,
  } = useAdvisorStore();

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

  return (
    <>
      <button
        onClick={toggleOpen}
        className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#C8F547] to-[#2DD4A8] shadow-lg transition-all duration-300 hover:shadow-xl"
        aria-label="Open AI Advisor"
      >
        <span className="text-2xl transition-transform group-hover:scale-110">
          {isOpen ? '\u2715' : '\u2728'}
        </span>
        {!isOpen && messages.length === 0 && (
          <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-red-500" />
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[90vw] flex-col overflow-hidden rounded-2xl border border-[#252a3a] bg-[#161922] shadow-2xl md:w-[400px]">
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#C8F547]/10 to-[#2DD4A8]/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{'\u2728'}</span>
              <div>
                <h3 className="text-sm font-semibold text-white">OpenRAG AI</h3>
                <p className="text-xs text-white/50">LightRAG / AgenticRAG / GraphRAG Advisor</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="rounded px-2 py-1 text-xs text-white/40 transition-colors hover:text-white/70"
              title="Start new conversation"
            >
              Reset
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="mt-8 text-center text-sm text-white/40">
                <p className="mb-2 text-2xl">{'\u2728'}</p>
                <p>Describe your documents and users.</p>
                <p className="mt-1">I&apos;ll choose between LightRAG</p>
                <p>and GraphRAG for the best fit.</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[#C8F547]/20 text-white'
                      : 'bg-white/5 text-white/90'
                  }`}
                >
                  <MessageContent content={message.content} />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <span className="text-sm text-white/50 animate-pulse">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            {error && <div className="text-center text-xs text-red-400">{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {recommendation && <RecommendationCard recommendation={recommendation} />}

          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your use case..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#C8F547]/50"
                disabled={isLoading}
              />
              <button
                onClick={() => void handleSend()}
                disabled={isLoading || !input.trim()}
                className="rounded-lg bg-[#C8F547] px-4 py-2 text-sm font-medium text-black transition-all hover:bg-[#C8F547]/90 disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold text-[#C8F547]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: AdvisorRecommendation;
}) {
  const color =
    STRATEGY_COLORS[recommendation.recommended as RAGStrategy] ?? '#C8F547';
  const recommendedMeta =
    STRATEGY_MAP[recommendation.recommended as RAGStrategy];

  return (
    <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-gradient-to-r from-white/5 to-white/[0.02] p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs text-white/50">Recommended:</span>
        <span className="text-sm font-bold uppercase" style={{ color }}>
          {recommendedMeta?.name ?? recommendation.recommended}
        </span>
      </div>
      {recommendation.reasoning && (
        <p className="text-xs leading-relaxed text-white/60">
          {recommendation.reasoning}
        </p>
      )}
      {Object.keys(recommendation.scores).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(recommendation.scores)
            .sort(([, left], [, right]) => right - left)
            .slice(0, 2)
            .map(([name, score]) => (
              <span
                key={name}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50"
              >
                {STRATEGY_MAP[name as RAGStrategy]?.name ?? name}:{' '}
                {(score * 100).toFixed(0)}%
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
