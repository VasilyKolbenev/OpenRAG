/**
 * Typed API client for OpenRAG backend.
 * All requests go through /api/ prefix (Vite proxy in dev, Traefik in prod).
 */

import type {
  QueryRequest,
  QueryResponse,
  CompareRequest,
  CompareResponse,
  DocumentResponse,
  DocumentDetail,
  DocumentListResponse,
  DeleteDocumentResponse,
  CollectionListResponse,
  StrategyListResponse,
  RecommendationRequest,
  RecommendationResponse,
  PipelineTrace,
  GraphData,
  QualityMetrics,
  HealthResponse,
  AdvisorChatRequest,
  AdvisorChatResponse,
  SessionListResponse,
} from '@/types/api';

// ── Base ───────────────────────────────────────────

const BASE = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  return res.json() as Promise<T>;
}

// ── Query ──────────────────────────────────────────

export async function query(params: QueryRequest): Promise<QueryResponse> {
  return request<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Stream a query via SSE (POST).
 * Returns a ReadableStream of SSE chunks.
 * Uses fetch (not EventSource) because we need POST.
 */
export async function queryStream(
  params: QueryRequest,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const url = `${BASE}/query/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  if (!res.body) {
    throw new Error('ReadableStream not supported');
  }

  return res.body;
}

// ── Compare ────────────────────────────────────────

export async function compare(params: CompareRequest): Promise<CompareResponse> {
  return request<CompareResponse>('/compare', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Documents ──────────────────────────────────────

export async function uploadDocument(
  file: File,
  collection: string = 'default',
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('collection', collection);

  const url = `${BASE}/documents/upload`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  return res.json() as Promise<DocumentResponse>;
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  return request<DocumentDetail>(`/documents/${id}`);
}

export async function listDocuments(
  collection?: string,
): Promise<DocumentListResponse> {
  const params = collection ? `?collection=${encodeURIComponent(collection)}` : '';
  return request<DocumentListResponse>(`/documents${params}`);
}

export async function deleteDocument(id: string): Promise<DeleteDocumentResponse> {
  return request<DeleteDocumentResponse>(`/documents/${id}`, {
    method: 'DELETE',
  });
}

// ── Collections ────────────────────────────────────

export async function getCollections(): Promise<CollectionListResponse> {
  return request<CollectionListResponse>('/collections');
}

// ── Strategies ─────────────────────────────────────

export async function getStrategies(): Promise<StrategyListResponse> {
  return request<StrategyListResponse>('/strategies');
}

export async function recommend(
  params: RecommendationRequest,
): Promise<RecommendationResponse> {
  return request<RecommendationResponse>('/recommend', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Traces (RAG Debugger) ──────────────────────────

export async function getTrace(traceId: string): Promise<PipelineTrace> {
  return request<PipelineTrace>(`/traces/${traceId}`);
}

// ── Graph Explorer ─────────────────────────────────

export async function getGraph(params: {
  collection?: string;
  entity?: string;
  depth?: number;
  limit?: number;
}): Promise<GraphData> {
  const searchParams = new URLSearchParams();
  if (params.collection) searchParams.set('collection', params.collection);
  if (params.entity) searchParams.set('entity', params.entity);
  if (params.depth !== undefined) searchParams.set('depth', String(params.depth));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

  return request<GraphData>(`/graph/explore?${searchParams.toString()}`);
}

// ── Quality Metrics ────────────────────────────────

export async function getQualityMetrics(params: {
  strategy?: string;
  period?: string;
}): Promise<QualityMetrics> {
  const searchParams = new URLSearchParams();
  if (params.strategy) searchParams.set('strategy', params.strategy);
  if (params.period) searchParams.set('period', params.period);

  return request<QualityMetrics>(`/metrics/quality?${searchParams.toString()}`);
}

// ── Advisor Chatbot ───────────────────────────────

export async function advisorChat(
  params: AdvisorChatRequest,
): Promise<AdvisorChatResponse> {
  return request<AdvisorChatResponse>('/advisor/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Sessions ──────────────────────────────────────

export async function listSessions(): Promise<SessionListResponse> {
  return request<SessionListResponse>('/sessions');
}

export async function deleteSession(sessionId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

// ── Health ──────────────────────────────────────────

export async function health(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

// ── Analytics ─────────────────────────────────────

export interface AnalyticsData {
  strategy_usage: Record<string, number>;
  avg_latency_by_strategy: Record<string, number>;
  total_queries: number;
  top_queries: string[];
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/analytics');
}

// ── Engine Models ─────────────────────────────────

export interface EngineModel {
  name: string;
  provider: string;
  type: string;
  status: string;
  latency_ms: number | null;
}

export async function getEngineModels(): Promise<{ models: EngineModel[] }> {
  return request<{ models: EngineModel[] }>('/engine/models');
}

// ── Feedback ──────────────────────────────────────

export interface FeedbackRequest {
  query_id: string;
  rating: string;
  comment?: string;
}

export async function submitFeedback(params: FeedbackRequest): Promise<{ status: string }> {
  return request<{ status: string }>('/feedback', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Export as namespace ────────────────────────────

export const api = {
  query,
  queryStream,
  compare,
  uploadDocument,
  getDocument,
  listDocuments,
  deleteDocument,
  getCollections,
  getStrategies,
  recommend,
  getTrace,
  getGraph,
  getQualityMetrics,
  advisorChat,
  listSessions,
  deleteSession,
  health,
  getAnalytics,
  getEngineModels,
  submitFeedback,
} as const;

export { ApiError };
