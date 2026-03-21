/**
 * Chat input bar with strategy selector, document filter, and send button.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { STRATEGIES, STRATEGY_MAP } from '@/lib/constants';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import type { RAGStrategy, DocumentResponse } from '@/types/api';

interface ChatInputProps {
  onSend: (query: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);

  const selectedStrategy = useAppStore((s) => s.selectedStrategy);
  const setSelectedStrategy = useAppStore((s) => s.setSelectedStrategy);
  const selectedDocumentFilter = useAppStore((s) => s.selectedDocumentFilter);
  const setSelectedDocumentFilter = useAppStore((s) => s.setSelectedDocumentFilter);
  const meta = STRATEGY_MAP[selectedStrategy];

  // Fetch documents for the picker
  useEffect(() => {
    api.listDocuments().then((res) => {
      setDocuments(res.documents.filter((d) => d.status === 'indexed'));
    }).catch(() => {});
  }, []);

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

  const docLabel = selectedDocumentFilter
    ? selectedDocumentFilter.length > 20
      ? selectedDocumentFilter.slice(0, 18) + '...'
      : selectedDocumentFilter
    : 'All docs';

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

      {/* Document picker dropdown */}
      {showDocPicker && (
        <div className="absolute bottom-full left-[140px] mb-1 w-[280px] bg-serpent-surface border border-serpent-border rounded-lg shadow-xl z-50 py-1 max-h-[240px] overflow-y-auto">
          <button
            onClick={() => {
              setSelectedDocumentFilter(null);
              setShowDocPicker(false);
            }}
            className={`w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-serpent-surface-hover transition-colors ${
              !selectedDocumentFilter ? 'bg-serpent-surface-active' : ''
            }`}
          >
            <span className="text-[10px]">{'\uD83D\uDCDA'}</span>
            <span className="text-[12px] text-serpent-text-secondary font-medium">
              All documents
            </span>
          </button>
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setSelectedDocumentFilter(doc.filename);
                setShowDocPicker(false);
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-serpent-surface-hover transition-colors ${
                selectedDocumentFilter === doc.filename ? 'bg-serpent-surface-active' : ''
              }`}
            >
              <span className="text-[10px]">{'\uD83D\uDCC4'}</span>
              <span className="text-[12px] text-serpent-text-secondary font-medium truncate">
                {doc.filename}
              </span>
              <span className="text-[10px] text-serpent-text-dim ml-auto shrink-0">
                {doc.chunks} chunks
              </span>
            </button>
          ))}
          {documents.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-serpent-text-dim">
              No indexed documents
            </div>
          )}
        </div>
      )}

      <div className="flex gap-[6px] p-2.5 bg-serpent-surface border border-serpent-border border-t-0 rounded-b-[14px]">
        {/* Strategy badge (clickable) */}
        <button
          onClick={() => {
            setShowStrategyPicker(!showStrategyPicker);
            setShowDocPicker(false);
          }}
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

        {/* Document filter badge (clickable) */}
        <button
          onClick={() => {
            setShowDocPicker(!showDocPicker);
            setShowStrategyPicker(false);
          }}
          className={`flex items-center gap-[5px] px-[9px] py-[3px] bg-serpent-bg rounded-[5px] border text-[10px] font-mono shrink-0 hover:border-serpent-border-hover transition-colors cursor-pointer ${
            selectedDocumentFilter
              ? 'border-[#38BDF8]/30 text-[#38BDF8]'
              : 'border-serpent-border text-serpent-text-dim'
          }`}
          title="Filter by document"
        >
          <span className="text-[9px]">{selectedDocumentFilter ? '\uD83D\uDCC4' : '\uD83D\uDCDA'}</span>
          {docLabel}
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
