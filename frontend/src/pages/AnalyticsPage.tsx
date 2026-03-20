/**
 * AnalyticsPage — query analytics dashboard.
 * Fetches from GET /api/analytics.
 */

import { useEffect, useState } from 'react';
import { api, type AnalyticsData } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.getAnalytics().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-serpent-muted">Loading analytics...</div>;

  const strategyData = Object.entries(data.strategy_usage || {}).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-xl font-semibold text-serpent-text">Query Analytics</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-serpent-surface rounded-lg border border-serpent-border">
          <div className="text-2xl font-bold text-serpent-text">{data.total_queries}</div>
          <div className="text-xs text-serpent-muted">Total Queries</div>
        </div>
      </div>
      {strategyData.length > 0 && (
        <div className="p-4 bg-serpent-surface rounded-lg border border-serpent-border">
          <h3 className="text-sm font-medium text-serpent-text mb-3">Strategy Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={strategyData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
