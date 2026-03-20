/**
 * Left sidebar navigation for OpenRAG platform.
 * Organized by 5-primitive architecture.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import OpenRAGLogo from './OpenRAGLogo';
import { useAppStore } from '@/stores/appStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  color: string;
  items: NavItem[];
}

const ICON = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV_SECTIONS: NavSection[] = [
  {
    title: '',
    color: '#eeeef0',
    items: [
      {
        label: 'Command Center',
        path: '/dashboard',
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" />
            <rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" />
            <rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" />
            <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Intelligence',
    color: '#C8F547',
    items: [
      {
        label: 'Chat',
        path: '/chat',
        icon: ICON('M3 13.5V15l3-1.5h8A1.5 1.5 0 0015.5 12V4.5A1.5 1.5 0 0014 3H4A1.5 1.5 0 002.5 4.5V12A1.5 1.5 0 003 13.5z'),
      },
      {
        label: 'Compare',
        path: '/compare',
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="2" x2="9" y2="16" />
            <rect x="2" y="4" width="5" height="10" rx="1" />
            <rect x="11" y="4" width="5" height="10" rx="1" />
          </svg>
        ),
      },
      {
        label: 'Advisor',
        path: '/intelligence',
        icon: ICON('M9 1L11.5 6.5L17 7.5L13 11.5L14 17L9 14.5L4 17L5 11.5L1 7.5L6.5 6.5L9 1z'),
      },
    ],
  },
  {
    title: 'Agents',
    color: '#8B5CF6',
    items: [
      {
        label: 'Documents',
        path: '/documents',
        icon: ICON('M2.5 5.5A1.5 1.5 0 014 4h3l1.5 1.5H14a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0114 14.5H4A1.5 1.5 0 012.5 13V5.5z'),
      },
    ],
  },
  {
    title: 'Learning',
    color: '#2DD4A8',
    items: [
      {
        label: 'Debugger',
        path: '/debugger',
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="5" />
            <line x1="9" y1="4" x2="9" y2="2" />
            <line x1="9" y1="16" x2="9" y2="14" />
            <line x1="4" y1="9" x2="2" y2="9" />
            <line x1="16" y1="9" x2="14" y2="9" />
          </svg>
        ),
      },
    ],
  },
];

const HEALTH_CONFIG = {
  healthy: { color: '#22c55e', label: 'All systems operational' },
  degraded: { color: '#eab308', label: 'Degraded performance' },
  offline: { color: '#ef4444', label: 'Services offline' },
} as const;

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const healthStatus = useAppStore((s) => s.healthStatus);
  const health = HEALTH_CONFIG[healthStatus];

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col"
      style={{
        width: 240,
        backgroundColor: '#0c0e16',
        borderRight: '1px solid #1e2230',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 shrink-0" style={{ height: 56 }}>
        <OpenRAGLogo size={26} />
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#eeeef0' }}>
          OpenRAG
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, backgroundColor: '#1e2230' }} />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 pt-3 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-3' : ''}>
            {/* Section title */}
            {section.title && (
              <p
                className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: `${section.color}90` }}
              >
                {section.title}
              </p>
            )}

            {/* Items */}
            {section.items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/');

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150 w-full"
                  style={{
                    color: isActive ? '#eeeef0' : '#71717a',
                    backgroundColor: isActive ? '#1c1f2b' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#a1a1aa';
                      e.currentTarget.style.backgroundColor = '#161922';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#71717a';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 rounded-r"
                      style={{ width: 2, backgroundColor: section.color || '#00d4ff' }}
                    />
                  )}
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Health status */}
      <div className="px-5 pb-4 pt-2 shrink-0">
        <div
          className="mx-auto rounded-md px-3 py-2 flex items-center gap-2"
          style={{ backgroundColor: '#161922' }}
        >
          <span
            className="inline-block shrink-0 rounded-full"
            style={{
              width: 6,
              height: 6,
              backgroundColor: health.color,
              boxShadow: `0 0 6px ${health.color}40`,
            }}
          />
          <span className="text-[11px] font-medium truncate" style={{ color: '#71717a' }}>
            {health.label}
          </span>
        </div>
      </div>
    </aside>
  );
}
