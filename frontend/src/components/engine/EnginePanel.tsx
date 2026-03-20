/**
 * EnginePanel — displays configured models and their status.
 * Fetches from GET /api/engine/models.
 */

import { useEffect, useState } from 'react';
import { api, type EngineModel } from '../../lib/api';

export default function EnginePanel() {
  const [models, setModels] = useState<EngineModel[]>([]);

  useEffect(() => {
    api.getEngineModels().then(res => setModels(res.models || []));
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
