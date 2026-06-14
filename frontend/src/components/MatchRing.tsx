interface Props {
  pct: number;
  size?: number;
}

export default function MatchRing({ pct, size = 56 }: Props) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--g-4)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        <span className="num" style={{ fontWeight: 800, fontSize: 16, color: 'var(--c-accent-600)' }}>
          {pct}
        </span>
        <span style={{ fontSize: 9, color: 'var(--t-2nd)', marginTop: 1, whiteSpace: 'nowrap' }}>
          匹配
        </span>
      </div>
    </div>
  );
}
