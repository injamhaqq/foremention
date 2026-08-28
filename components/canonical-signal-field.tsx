type SignalPoint = { x: number; y: number; r: number; tone?: "light" | "deep" };

const points: SignalPoint[] = [
  { x: 66, y: 38, r: 1.8 },
  { x: 78, y: 46, r: 2.2, tone: "light" },
  { x: 84, y: 59, r: 1.5 },
  { x: 73, y: 67, r: 1.8 },
  { x: 58, y: 72, r: 1.4 },
  { x: 43, y: 67, r: 1.7 },
  { x: 34, y: 56, r: 1.3 },
  { x: 37, y: 42, r: 1.5 },
  { x: 49, y: 32, r: 1.7, tone: "light" },
  { x: 60, y: 27, r: 1.2 },
  { x: 91, y: 47, r: 1.4 },
  { x: 21, y: 49, r: 1.3 },
  { x: 27, y: 34, r: 1.1 },
  { x: 88, y: 77, r: 1.1 },
  { x: 23, y: 76, r: 1.2 },
  { x: 50, y: 83, r: 1.5, tone: "light" },
];

export function CanonicalSignalField({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`canonical-signal${compact ? " canonical-signal--compact" : ""}`} aria-hidden="true">
      <svg className="canonical-signal__svg" viewBox="0 0 100 100" role="presentation" focusable="false">
        <defs>
          <radialGradient id="fmSignalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFDF9" stopOpacity="1" />
            <stop offset="20%" stopColor="#A7DFC1" stopOpacity="0.92" />
            <stop offset="52%" stopColor="#65B58E" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#176347" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fmBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#65B58E" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFDF9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#65B58E" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <g className="canonical-signal__grid">
          {[20, 30, 40, 50, 60, 70, 80].map((n) => <line key={`v-${n}`} x1={n} y1="0" x2={n} y2="100" />)}
          {[20, 30, 40, 50, 60, 70, 80].map((n) => <line key={`h-${n}`} x1="0" y1={n} x2="100" y2={n} />)}
        </g>

        <g className="canonical-signal__rings">
          {[9, 17, 25, 34, 43].map((r) => <circle key={r} cx="58" cy="45" r={r} />)}
        </g>

        <line className="canonical-signal__axis canonical-signal__axis--x" x1="8" y1="45" x2="100" y2="45" />
        <rect className="canonical-signal__beam" x="57.72" y="5" width="0.56" height="82" fill="url(#fmBeam)" />

        <g className="canonical-signal__points">
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={point.r / 2}
              className={point.tone === "light" ? "is-light" : undefined}
            />
          ))}
        </g>

        <circle className="canonical-signal__halo" cx="58" cy="45" r="10" fill="url(#fmSignalGlow)" />
        <circle className="canonical-signal__core" cx="58" cy="45" r="1.35" />

        <path className="canonical-signal__horizon canonical-signal__horizon--back" d="M -8 94 Q 50 70 108 94" />
        <path className="canonical-signal__horizon canonical-signal__horizon--front" d="M -10 99 Q 50 75 110 99" />
      </svg>
      <span className="canonical-signal__caption">signals → registered evidence → reviewable record</span>
    </div>
  );
}
