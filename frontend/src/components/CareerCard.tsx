import { useState } from 'react';
import Icon from './Icon';
import MatchRing from './MatchRing';
import type { AiAction, ReviewedCareer } from '../types';

interface Props {
  item: ReviewedCareer;
  defaultOpen?: boolean;
}

const LEVEL_COLOR: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#E7F8EE', fg: '#137a45' },
  B: { bg: 'var(--c-blue-wash)', fg: 'var(--c-blue-700)' },
  C: { bg: 'var(--c-accent-wash)', fg: 'var(--c-accent-600)' },
  D: { bg: 'var(--g-3)', fg: 'var(--t-body)' },
};

const AI_BADGE: Partial<Record<AiAction, { label: string; icon: string; bg: string; fg: string }>> = {
  upgrade_display: { label: 'AI 上调', icon: 'arrow-up', bg: 'var(--c-cyan-wash)', fg: 'var(--c-cyan-ink)' },
  downgrade_display: { label: 'AI 下调', icon: 'arrow-down', bg: 'var(--c-accent-wash)', fg: 'var(--c-accent-600)' },
  warn_only: { label: 'AI 提醒', icon: 'message-circle-warning', bg: 'var(--g-3)', fg: 'var(--t-body)' },
};

export default function CareerCard({ item, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const lvl = LEVEL_COLOR[item.display_level] ?? LEVEL_COLOR.B;
  const aiBadge = AI_BADGE[item.ai_action];

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
              {item.career_name}
            </span>
            {aiBadge && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  font: '700 10px/1 var(--font-cn)',
                  color: aiBadge.fg,
                  background: aiBadge.bg,
                  borderRadius: 'var(--r-full)',
                  padding: '4px 7px',
                }}
              >
                <Icon name={aiBadge.icon} size={10} />
                {aiBadge.label}
              </span>
            )}
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
              {item.display_level} · {item.level_label}
            </span>
            <span className="chip chip--grey" style={{ height: 22 }}>
              <Icon name="graduation-cap" size={11} /> {item.min_education}
            </span>
            {item.license_required && (
              <span className="chip chip--accent" style={{ height: 22 }}>
                <Icon name="badge-check" size={11} /> 需{item.license_required}
              </span>
            )}
          </div>
          {item.matched_industries.length > 0 && (
            <div style={{ font: '500 11px/1.4 var(--font-cn)', color: 'var(--t-2nd)', marginTop: 7 }}>
              来自：{item.matched_industries.join(' · ')}
            </div>
          )}
        </div>
        <MatchRing pct={Math.min(99, item.display_score)} />
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
        {open ? '收起' : '诚实提示 · 入门专业 · 准备路径'}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
      </button>

      {open && (
        <div className="rise" style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {item.user_facing_explanation && (
            <div
              style={{
                font: '500 12.5px/1.6 var(--font-cn)',
                color: 'var(--c-blue-700)',
                background: 'var(--c-blue-wash2)',
                borderRadius: 'var(--r-sm)',
                padding: '10px 12px',
                borderLeft: '3px solid var(--c-blue)',
                textWrap: 'pretty' as never,
              }}
            >
              <Icon name="sparkles" size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />
              {item.user_facing_explanation}
            </div>
          )}

          {item.honest_note && (
            <div>
              <DetailHead icon="shield-alert" color="var(--c-accent-600)" label="诚实提示" />
              <div
                style={{
                  marginTop: 8,
                  font: '500 12.5px/1.65 var(--font-cn)',
                  color: 'var(--t-body)',
                  background: 'var(--c-accent-wash)',
                  borderRadius: 'var(--r-sm)',
                  padding: '10px 12px',
                  textWrap: 'pretty' as never,
                }}
              >
                {item.honest_note}
              </div>
            </div>
          )}

          {item.risk_warning && (
            <div
              style={{
                font: '600 12px/1.55 var(--font-cn)',
                color: 'var(--c-accent-600)',
                display: 'flex',
                gap: 7,
                alignItems: 'flex-start',
              }}
            >
              <Icon name="alert-triangle" size={14} color="var(--c-accent-600)" style={{ marginTop: 1 }} />
              {item.risk_warning}
            </div>
          )}

          {item.risk_notes.length > 0 && (
            <div>
              <DetailHead icon="message-circle-warning" color="var(--c-accent-600)" label="风险与现实" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                {item.risk_notes.map((r, i) => (
                  <Bullet key={i}>{r}</Bullet>
                ))}
              </div>
            </div>
          )}

          {item.entry_majors.length > 0 && (
            <div>
              <DetailHead icon="graduation-cap" color="var(--c-blue)" label="入门专业" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {item.entry_majors.map((m, i) => (
                  <span key={i} className="chip chip--cyan" style={{ height: 24 }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.development_path.length > 0 && (
            <div>
              <DetailHead icon="route" color="var(--c-cyan-ink)" label="大学准备路径" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                {item.development_path.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        flex: 'none',
                        borderRadius: '50%',
                        background: 'var(--c-blue-wash)',
                        color: 'var(--c-blue-700)',
                        font: '700 10px/18px var(--font-num)',
                        textAlign: 'center',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ font: '500 12.5px/1.5 var(--font-cn)', color: 'var(--t-body)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.career_ladder && (
            <div style={{ font: '500 12px/1.5 var(--font-cn)', color: 'var(--t-2nd)' }}>
              <Icon name="trending-up" size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />
              晋升路径：{item.career_ladder}
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
      <span style={{ font: '700 12.5px/1 var(--font-cn)', color: 'var(--t-title)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        font: '500 12.5px/1.55 var(--font-cn)',
        color: 'var(--t-body)',
      }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-accent)', flex: 'none', marginTop: 7 }}
      />
      {children}
    </div>
  );
}
