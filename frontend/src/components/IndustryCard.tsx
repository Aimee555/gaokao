import { useState } from 'react';
import Icon from './Icon';
import MatchRing from './MatchRing';
import type { MatchedIndustry } from '../types';

interface Props {
  item: MatchedIndustry;
  defaultOpen?: boolean;
}

const TIER_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  employment_friendly: { label: '就业友好', cls: 'badge-future', icon: 'briefcase' },
  policy_growth: { label: '政策成长', cls: 'badge-human', icon: 'trending-up' },
  future_frontier: { label: '未来产业', cls: 'badge-future', icon: 'zap' },
};

const LEVEL_COLOR: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#E7F8EE', fg: '#137a45' },
  B: { bg: 'var(--c-blue-wash)', fg: 'var(--c-blue-700)' },
  C: { bg: 'var(--c-accent-wash)', fg: 'var(--c-accent-600)' },
  D: { bg: 'var(--g-3)', fg: 'var(--t-body)' },
};

export default function IndustryCard({ item, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const tier = TIER_LABEL[item.tier] ?? { label: item.tier, cls: 'badge-human', icon: 'flag' };
  const lvl = LEVEL_COLOR[item.level] ?? LEVEL_COLOR.B;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--sh-1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: 12, padding: '14px 14px 12px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            flex: 'none',
            borderRadius: 8,
            marginTop: 2,
            background: item.rank === 1 ? 'var(--c-accent)' : 'var(--c-navy)',
            color: '#fff',
            font: '800 13px/1 var(--font-num)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ font: '700 16px/1.25 var(--font-cn)', color: 'var(--t-title)' }}>
              {item.industry_name}
            </span>
            <span
              className={tier.cls}
              style={{ background: undefined }}
            >
              <Icon name={tier.icon} size={10} />
              {tier.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                font: '700 11.5px/1 var(--font-cn)',
                color: lvl.fg,
                background: lvl.bg,
                borderRadius: 'var(--r-full)',
                padding: '4px 10px',
              }}
            >
              {item.level} · {item.level_label}
            </span>
            <span style={{ font: '500 11.5px/1 var(--font-cn)', color: 'var(--t-2nd)' }}>
              画像 {item.profile_match_score} · 市场 {item.market_fit_score}
            </span>
          </div>
        </div>
        <MatchRing pct={Math.min(99, item.score)} />
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          border: 'none',
          borderTop: '1px solid var(--border)',
          cursor: 'pointer',
          background: open ? 'var(--c-blue-wash2)' : 'transparent',
          color: 'var(--c-blue)',
          font: '600 13px/1 var(--font-cn)',
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
        }}
      >
        {open ? '收起' : '方向简介 · 典型职业路径'}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
      </button>

      {open && (
        <div
          className="rise"
          style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {item.recommendation_note && (
            <div
              style={{
                font: '500 13px/1.6 var(--font-cn)',
                color: 'var(--t-body)',
                background: 'var(--g-2)',
                borderRadius: 'var(--r-sm)',
                padding: '10px 12px',
                textWrap: 'pretty' as never,
              }}
            >
              {item.recommendation_note}
            </div>
          )}

          {item.related_career_paths.length > 0 && (
            <div>
              <DetailHead icon="briefcase" color="var(--c-cyan-ink)" label="典型职业路径" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {item.related_career_paths.map((c, i) => (
                  <span key={i} className="chip chip--grey" style={{ height: 24 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailHead({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <Icon name={icon} size={15} color={color} />
      <span
        style={{
          font: '700 12.5px/1 var(--font-cn)',
          color: 'var(--t-title)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}
