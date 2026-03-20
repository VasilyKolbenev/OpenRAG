/**
 * EnginePanel — displays configured models and their status.
 * Fetches from GET /api/v1/engine/models.
 */

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface ModelInfo {
  name: string;
  provider: string;
  type: string;
  status: string;
  latency_ms: number | null;
}

export default function EnginePanel() {
  const [models, setModels] = useState<ModelInfo[]>([]);

  useEffect(() => {
    api.get('/engine/models').then(res => setModels(res.data.models || []));
  }, []);

  return (
    <div className="p-4 bg-serpent-surface rounded-lg border border-serpent-border">
      <h3 className="text-sm font-medium text-serpent-text mb-3">Engine Models</h3>
      <div className="space-y-2">
        {models.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-serpent-text">{m.name}</span>
            <span className="text-serpent-muted">{m.provider}</span>
            <span className={m.status === 'connected' ? 'text-green-400' : 'text-yellow-400'}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
