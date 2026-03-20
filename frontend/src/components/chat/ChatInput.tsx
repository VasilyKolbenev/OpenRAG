/**
 * Chat input bar with strategy selector dropdown and send button.
 */

import { useState, useRef, useCallback } from 'react';
import { STRATEGIES, STRATEGY_MAP } from '@/lib/constants';
import { useAppStore } from '@/stores/appStore';
import type { RAGStrategy } from '@/types/api';

interface ChatInputProps {
  onSend: (query: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const selectedStrategy = useAppStore((s) => s.selectedStrategy);
  const setSelectedStrategy = useAppStore((s) => s.setSelectedStrategy);
  const meta = STRATEGY_MAP[selectedStrategy];

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || pendingRef.current) return;
    pendingRef.current = true;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      pendingRef.current = false;
    });
  }, [value, disabled, onSend]);

  return (
    <div className="relative">
      {/* Strategy picker dropdown */}
      {showStrategyPicker && (
        <div className="absolute bottom-full left-0 mb-1 w-[260px] bg-serpent-surface border border-serpent-border rounded-lg shadow-xl z-50 py-1">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStrategy(s.id as RAGStrategy);
                setShowStrategyPicker(false);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-serpent-surface-hover transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[12px] text-serpent-text-secondary font-medium">
                {s.name}
              </span>
              <span className="text-[10px] text-serpent-text-dim ml-auto">
                {s.latency}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-[6px] p-2.5 bg-serpent-surface border border-serpent-border border-t-0 rounded-b-[14px]">
        {/* Strategy badge (clickable) */}
        <button
          onClick={() => setShowStrategyPicker(!showStrategyPicker)}
          className="flex items-center gap-[5px] px-[9px] py-[3px] bg-serpent-bg rounded-[5px] border border-serpent-border text-[10px] font-mono shrink-0 hover:border-serpent-border-hover transition-colors cursor-pointer"
          style={{ color: meta?.color }}
          title="Change strategy"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: meta?.color }}
          />
          {meta?.name}
          <span className="text-[8px] text-serpent-text-dim ml-0.5">{'\u25BC'}</span>
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask your documents anything..."
          disabled={disabled}
          maxLength={5000}
          aria-label="Query input"
          className="flex-1 px-[13px] py-[9px] text-[12.5px] bg-serpent-bg border border-serpent-border rounded-[7px] text-serpent-text-secondary font-dm-sans placeholder:text-serpent-text-dark disabled:opacity-50"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="px-[18px] py-[9px] text-[11px] bg-[#C8F547] text-[#0f1117] border-none rounded-[7px] font-semibold cursor-pointer font-outfit transition-opacity duration-200 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
