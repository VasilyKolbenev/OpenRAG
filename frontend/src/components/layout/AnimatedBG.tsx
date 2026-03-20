/**
 * Animated background with subtle gradient orbs.
 */

export default function AnimatedBG() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Subtle grid pattern */}
      <svg
        width="100%"
        height="100%"
        className="absolute opacity-[0.03]"
      >
        <defs>
          <pattern
            id="gridPattern"
            x="0"
            y="0"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M48 0H0v48"
              stroke="#a1a1aa"
              strokeWidth="0.5"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />
      </svg>

      {/* Floating gradient orbs */}
      <div
        className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] animate-serpent-float"
        style={{
          background:
            'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-[15%] -left-[5%] w-[500px] h-[500px] animate-serpent-float-reverse"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-[40%] left-[50%] w-[400px] h-[400px] animate-serpent-float-delayed"
        style={{
          background:
            'radial-gradient(circle, rgba(45,212,168,0.03) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
