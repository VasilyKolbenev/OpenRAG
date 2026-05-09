/**
 * Design tokens, strategy data, and advisor questions.
 * Shared constants for the OpenRAG frontend.
 */

import type {
  StrategyMeta,
  AdvisorQuestion,
  TabInfo,
  PipelineConfigItem,
} from '@/types/ui';
import type { RAGStrategy } from '@/types/api';

const LIGHTRAG_META: StrategyMeta = {
  id: 'lightrag',
  name: 'LightRAG',
  icon: '✦',
  color: '#2DD4A8',
  desc: 'Fast dual-level retrieval for production document stacks. ReasoningBank reuses retrieval lessons while TurboQuant keeps runtime lean.',
  tags: ['Default Engine', 'ReasoningBank', 'TurboQuant', 'Multimodal-ready'],
  strengths: [
    'Dense + sparse retrieval fusion',
    'ReasoningBank lesson recall',
    'Low-to-medium latency',
    'Good default for mixed corpora',
  ],
  useCases: [
    'Enterprise knowledge bases',
    'Document Q&A across PDFs, tables, and notes',
    'Customer support and internal search',
    'Commercial deployments that need predictable speed',
  ],
  complexity: 2,
  latency: 'Low-Medium',
  accuracy: 'High',
};

const AGENTICRAG_META: StrategyMeta = {
  id: 'agentic',
  name: 'AgenticRAG',
  icon: '◇',
  color: '#F59E0B',
  desc: 'Autonomous research agent with multi-step planning, tool use, and self-reflection. Best when one question hides several sub-questions and needs deliberate reasoning.',
  tags: ['Multi-step', 'Planning', 'Self-reflection', 'Research-grade'],
  strengths: [
    'Plans queries into sub-questions',
    'Iterates over retrieval and tools',
    'Reflects and refines before answering',
    'High accuracy on complex investigative tasks',
  ],
  useCases: [
    'Investigative research and discovery',
    'Complex multi-hop questions across documents',
    'Audit-style reviews that need a reasoning trail',
    'Workflows where speed matters less than quality',
  ],
  complexity: 5,
  latency: 'Medium-High',
  accuracy: 'Very High',
};

const GRAPHRAG_META: StrategyMeta = {
  id: 'graph',
  name: 'GraphRAG',
  icon: '🕸️',
  color: '#8B5CF6',
  desc: 'Relationship-centric retrieval over a knowledge graph. Best when the answer depends on entities, links, lineage, and explainable traversal.',
  tags: ['Knowledge Graph', 'Explainable', 'Entity Relations', 'Auditable'],
  strengths: [
    'Entity and relation traversal',
    'Explainable multi-hop evidence',
    'Adaptive hop expansion with ReasoningBank',
    'Strong fit for regulated domains',
  ],
  useCases: [
    'Legal and compliance corpora',
    'Research and due diligence',
    'Medical and technical knowledge graphs',
    'Cases where answer provenance matters',
  ],
  complexity: 4,
  latency: 'Medium',
  accuracy: 'High',
};

export const STRATEGIES: StrategyMeta[] = [
  LIGHTRAG_META,
  AGENTICRAG_META,
  GRAPHRAG_META,
];

export const STRATEGY_MAP: Record<RAGStrategy, StrategyMeta> = {
  lightrag: LIGHTRAG_META,
  hybrid: LIGHTRAG_META,
  naive: LIGHTRAG_META,
  memo: LIGHTRAG_META,
  agentic: AGENTICRAG_META,
  graph: GRAPHRAG_META,
  corrective: GRAPHRAG_META,
  wiki: GRAPHRAG_META,
};

export const STRATEGY_COLORS: Record<RAGStrategy, string> = {
  lightrag: LIGHTRAG_META.color,
  hybrid: LIGHTRAG_META.color,
  naive: LIGHTRAG_META.color,
  memo: LIGHTRAG_META.color,
  agentic: AGENTICRAG_META.color,
  graph: GRAPHRAG_META.color,
  corrective: GRAPHRAG_META.color,
  wiki: GRAPHRAG_META.color,
};

export const ADVISOR_QUESTIONS: AdvisorQuestion[] = [
  {
    id: 'domain',
    question: 'Which business context are you solving for?',
    options: [
      'Enterprise / Operations',
      'Legal / Compliance',
      'Medical / Healthcare',
      'Research / Academic',
      'Technical / Engineering',
      'Customer Support',
    ],
  },
  {
    id: 'complexity',
    question: 'What do your users ask most often?',
    options: [
      'Direct answers from long documents',
      'Questions that connect many related facts',
      'Mixed fact + thematic exploration',
      'Audit-style or investigative queries',
    ],
  },
  {
    id: 'data',
    question: 'How is the knowledge structured?',
    options: [
      'Mostly text, tables, and mixed documents',
      'Entity-heavy data with explicit relationships',
      'Multimodal corpora that change often',
      'A curated graph or ontology already exists',
    ],
  },
  {
    id: 'priority',
    question: 'What matters most commercially?',
    options: [
      'Predictable speed',
      'Balanced default',
      'Explainability / lineage',
      'Maximum relationship accuracy',
    ],
  },
];

export const TABS: TabInfo[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'chat', label: 'Chat', icon: '◉' },
  { id: 'documents', label: 'Documents', icon: '▫' },
  { id: 'compare', label: 'Compare', icon: '≡' },
  { id: 'debugger', label: 'Debugger', icon: '◆' },
];

const LIGHTRAG_PIPELINE: PipelineConfigItem[] = [
  { label: 'Query Mode', value: 'hybrid', type: 'select' },
  { label: 'ReasoningBank', value: true, type: 'toggle' },
  { label: 'TurboQuant', value: true, type: 'toggle' },
  { label: 'TurboQuant Bits', value: '4', type: 'number' },
  { label: 'Re-ranker', value: 'Cross-Encoder', type: 'select' },
];

const AGENTICRAG_PIPELINE: PipelineConfigItem[] = [
  { label: 'Planning', value: true, type: 'toggle' },
  { label: 'Self-reflection', value: true, type: 'toggle' },
  { label: 'Max Iterations', value: '5', type: 'number' },
  { label: 'ReasoningBank', value: true, type: 'toggle' },
  { label: 'Tool Selection', value: 'LLM-routed', type: 'select' },
];

const GRAPHRAG_PIPELINE: PipelineConfigItem[] = [
  { label: 'Graph Backend', value: 'Neo4j', type: 'select' },
  { label: 'Max Hop Depth', value: '3', type: 'number' },
  { label: 'ReasoningBank', value: true, type: 'toggle' },
  { label: 'TurboQuant', value: true, type: 'toggle' },
  { label: 'Entity Expansion', value: 'Adaptive', type: 'select' },
];

export const PIPELINE_CONFIGS: Record<RAGStrategy, PipelineConfigItem[]> = {
  lightrag: LIGHTRAG_PIPELINE,
  hybrid: LIGHTRAG_PIPELINE,
  naive: LIGHTRAG_PIPELINE,
  memo: LIGHTRAG_PIPELINE,
  agentic: AGENTICRAG_PIPELINE,
  graph: GRAPHRAG_PIPELINE,
  corrective: GRAPHRAG_PIPELINE,
  wiki: GRAPHRAG_PIPELINE,
};

export const SUPPORTED_FORMATS = ['pdf', 'docx', 'txt', 'md', 'csv', 'json'];

export const DEFAULT_QUERY_PARAMS = {
  collection: 'default',
  top_k: 10,
  temperature: 0.1,
  query_mode: 'hybrid',
  enable_reasoning_bank: true,
  reasoning_memory_limit: 3,
  turboquant_enabled: true,
  turboquant_bits: 4,
} as const;

export const HEALTH_POLL_INTERVAL = 30_000;
