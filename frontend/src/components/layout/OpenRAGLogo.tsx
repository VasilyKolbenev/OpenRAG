/**
 * OpenRAG logo — abstract neural graph icon.
 */

interface OpenRAGLogoProps {
  size?: number;
}

export default function OpenRAGLogo({ size = 32 }: OpenRAGLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="oragGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#1e3a5f" />
        </linearGradient>
      </defs>
      {/* Central node */}
      <circle cx="50" cy="50" r="8" fill="url(#oragGrad)" />
      {/* Outer nodes */}
      <circle cx="20" cy="30" r="5" fill="#00d4ff" opacity="0.8" />
      <circle cx="80" cy="25" r="5" fill="#00d4ff" opacity="0.8" />
      <circle cx="75" cy="75" r="5" fill="#00d4ff" opacity="0.8" />
      <circle cx="25" cy="70" r="5" fill="#00d4ff" opacity="0.6" />
      <circle cx="50" cy="15" r="4" fill="#00d4ff" opacity="0.5" />
      {/* Edges */}
      <line x1="50" y1="50" x2="20" y2="30" stroke="#00d4ff" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="50" x2="80" y2="25" stroke="#00d4ff" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="50" x2="75" y2="75" stroke="#00d4ff" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="50" x2="25" y2="70" stroke="#00d4ff" strokeWidth="1.5" opacity="0.3" />
      <line x1="50" y1="50" x2="50" y2="15" stroke="#00d4ff" strokeWidth="1.5" opacity="0.3" />
      <line x1="20" y1="30" x2="50" y2="15" stroke="#1e3a5f" strokeWidth="1" opacity="0.3" />
      <line x1="80" y1="25" x2="75" y2="75" stroke="#1e3a5f" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}
