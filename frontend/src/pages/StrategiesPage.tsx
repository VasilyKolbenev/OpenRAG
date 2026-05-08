/**
 * Engine selection page with advisor and pipeline overview.
 */

import { useState } from 'react';
import StrategyCard from '@/components/strategies/StrategyCard';
import AdvisorPanel from '@/components/strategies/AdvisorPanel';
import { STRATEGIES } from '@/lib/constants';
import { useAppStore } from '@/stores/appStore';
import type { RAGStrategy } from '@/types/api';

const PIPELINE_STEPS = [
  { label: 'Ingest', desc: 'PDF · DOCX · CSV · API', icon: '\uD83D\uDCE5', color: '#38BDF8' },
  { label: 'Process', desc: 'Chunk · Embed · Extract', icon: '\u2699\uFE0F', color: '#C8F547' },
  { label: 'Index', desc: 'Vector + Graph + BM25', icon: '\uD83D\uDDC4\uFE0F', color: '#8B5CF6' },
  { label: 'Retrieve', desc: 'LightRAG or GraphRAG', icon: '\uD83D\uDD0D', color: '#2DD4A8' },
  { label: 'Generate', desc: 'LLM + Citations', icon: '\uD83D\uDCAC', color: '#F472B6' },
];

export default function StrategiesPage() {
  const selectedStrategy = useAppStore((state) => state.selectedStrategy);
  const setSelectedStrategy = useAppStore((state) => state.setSelectedStrategy);
  const [showAdvisor, setShowAdvisor] = useState(false);

  return (
    <div className="animate-fade-slide-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-[5px] text-[26px] font-semibold tracking-tight font-outfit">
            Choose Your Engine
          </h1>
          <p className="text-[13px] text-serpent-text-muted font-dm-sans">
            LightRAG and GraphRAG cover the product surface. Pick the engine that
            matches your knowledge structure and delivery goals.
          </p>
        </div>
        <button
          onClick={() => setShowAdvisor(!showAdvisor)}
          className="px-[18px] py-2 text-[11px] rounded-lg cursor-pointer font-medium font-dm-sans transition-all duration-200"
          style={{
            background: showAdvisor ? '#C8F54708' : '#0e0e0e',
            border: `1px solid ${showAdvisor ? '#C8F54730' : '#1e1e1e'}`,
            color: showAdvisor ? '#C8F547' : '#777',
          }}
        >
          {'\u2728'} Engine Advisor
        </button>
      </div>

      {showAdvisor && (
        <div className="bg-serpent-surface border border-serpent-border-light rounded-[14px] p-6 mb-5 animate-fade-slide-up">
          <AdvisorPanel
            onComplete={(id: RAGStrategy) => {
              setSelectedStrategy(id);
              setShowAdvisor(false);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
        {STRATEGIES.map((strategy, index) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            selected={selectedStrategy === strategy.id}
            onSelect={(id) => setSelectedStrategy(id as RAGStrategy)}
            index={index}
          />
        ))}
      </div>

      <div className="mt-7 rounded-[14px] border border-serpent-border-light bg-serpent-surface p-6">
        <h3 className="mb-[18px] text-[14px] font-semibold tracking-tight font-outfit text-serpent-text-secondary">
          OpenRAG Execution Pipeline
        </h3>
        <div className="grid grid-cols-5 gap-[6px] text-center">
          {PIPELINE_STEPS.map((step, index) => (
            <div
              key={step.label}
              className="relative rounded-[10px] border border-[#141414] bg-serpent-bg px-2.5 py-[18px]"
            >
              <div className="mb-[6px] text-[22px]">{step.icon}</div>
              <div
                className="mb-[3px] text-[11px] font-semibold font-mono"
                style={{ color: step.color }}
              >
                {step.label}
              </div>
              <div className="text-[9.5px] font-dm-sans text-serpent-text-dark">
                {step.desc}
              </div>
              {index < PIPELINE_STEPS.length - 1 && (
                <div className="absolute -right-[10px] top-1/2 z-[1] -translate-y-1/2 text-xs text-[#252525]">
                  {'\u2192'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
