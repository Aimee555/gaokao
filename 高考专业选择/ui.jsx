/* ============================================================
   ui.jsx — shared primitives (exported to window)
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* lucide icon -> inline SVG (reconciliation-safe, no createIcons) */
function toPascal(name) {
  return name.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}
function Icon({ name, size = 20, stroke = 2, color = "currentColor", style, className }) {
  const lib = (window.lucide && window.lucide.icons) || {};
  const node = lib[toPascal(name)] || lib[name];
  let kids = null;
  if (Array.isArray(node) && Array.isArray(node[2])) {
    kids = node[2].map((entry, i) => {
      const tag = entry[0];
      const attrs = entry[1] || {};
      return React.createElement(tag, { key: i, ...attrs });
    });
  }
  return (
    <svg
      className={className}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", ...style }}
    >
      {kids || <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}

/* circular match ring */
function MatchRing({ pct, size = 56 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--g-4)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--c-accent)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", lineHeight: 1,
      }}>
        <span className="num" style={{ fontWeight: 800, fontSize: 16, color: "var(--c-accent-600)" }}>{pct}</span>
        <span style={{ fontSize: 9, color: "var(--t-2nd)", marginTop: 1, whiteSpace: "nowrap" }}>匹配</span>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, MatchRing, toPascal });
