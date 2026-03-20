/**
 * Chat page — main RAG interface with streaming.
 * Primary workspace for asking questions about documents.
 */

import { useEffect, useCallback } from 'react';
import ChatPanel from '@/components/chat/ChatPanel';
import { useAppStore } from '@/stores/appStore';
import { useStreamQuery } from '@/hooks/useStreamQuery';
import { DEFAULT_QUERY_PARAMS } from '@/lib/constants';

export default function ChatPage() {
  const {
    messages,
    selectedStrategy,
    activeCollection,
    sessionId,
    addUserMessage,
    addAssistantMessage,
    updateAssistantMessage,
    setSessionId,
    clearSession,
  } = useAppStore();

  const { state: stream, start: startStream, isStreaming } = useStreamQuery();

  const assistantMsgs = messages.filter((m) => m.role === 'assistant');
  const lastAssistant = assistantMsgs[assistantMsgs.length - 1] ?? null;
  const streamingMsgId = lastAssistant?.isStreaming ? lastAssistant.id : null;

  useEffect(() => {
    if (!streamingMsgId) return;

    if (stream.tokens) {
      updateAssistantMessage(streamingMsgId, { content: stream.tokens });
    }

    if (stream.sources.length > 0) {
      updateAssistantMessage(streamingMsgId, { sources: stream.sources });
    }

    if (stream.phase === 'done') {
      updateAssistantMessage(streamingMsgId, {
        isStreaming: false,
        traceId: stream.traceId ?? undefined,
        latencyMs: stream.latencyMs ?? undefined,
        strategy: stream.strategyUsed ?? undefined,
      });

      if (stream.sessionId) {
        setSessionId(stream.sessionId);
      }
    }

    if (stream.phase === 'error') {
      updateAssistantMessage(streamingMsgId, {
        isStreaming: false,
        content: stream.error
          ? `Error: ${stream.error}`
          : 'An error occurred while processing your query.',
      });
    }
  }, [
    stream.tokens,
    stream.sources,
    stream.phase,
    stream.traceId,
    stream.latencyMs,
    stream.strategyUsed,
    stream.sessionId,
    stream.error,
    streamingMsgId,
    updateAssistantMessage,
    setSessionId,
  ]);

  const handleSend = useCallback(
    (query: string) => {
      addUserMessage(query, selectedStrategy);
      addAssistantMessage(selectedStrategy);

      startStream({
        ...DEFAULT_QUERY_PARAMS,
        query,
        strategy: selectedStrategy,
        collection: activeCollection,
        session_id: sessionId ?? undefined,
      });
    },
    [selectedStrategy, activeCollection, sessionId, addUserMessage, addAssistantMessage, startStream],
  );

  return (
    <div className="animate-fade-slide-up" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight font-outfit">
            Ask Your Documents
          </h1>
          <p className="text-[12px] text-serpent-text-muted">
            Query your indexed documents using AI-powered retrieval
          </p>
        </div>
        <button
          onClick={clearSession}
          className="px-3 py-1.5 rounded-lg border border-serpent-border bg-serpent-surface text-[11px] text-serpent-text-muted hover:text-serpent-text-secondary hover:border-serpent-border-hover transition-colors font-mono"
        >
          + New Chat
        </button>
      </div>

      {/* Full-width chat */}
      <div style={{ height: 'calc(100% - 70px)' }}>
        <ChatPanel
          messages={messages}
          streamPhase={stream.phase}
          onSend={handleSend}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
