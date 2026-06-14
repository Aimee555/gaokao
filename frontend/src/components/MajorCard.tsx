import { useState } from 'react';
import Icon from './Icon';
import MatchRing from './MatchRing';
import type { AiAction, ReviewedMajor } from '../types';

interface Props {
  item: ReviewedMajor;
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

export default function MajorCard({ item, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const lvl = LEVEL_COLOR[item.display_level] ?? LEVEL_COLOR.B;
  const aiBadge = AI_BADGE[item.ai_action];
  const needVerify = item.subject_eligibility === 'need_verify';

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
            width: 28, height: 28, flex: 'none', borderRadius: 8, marginTop: 2,
            background: item.rank === 1 ? 'var(--c-accent)' : 'var(--c-navy)',
            color: '#fff', font: '800 13px/1 var(--font-num)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {item.rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ font: '700 16px/1.25 var(--font-cn)', color: 'var(--t-title)' }}>{item.major_name}</span>
            {item.is_new_major && (
              <span className="badge-new" style={{ height: 20 }}>
                <Icon name="sparkle" size={10} /> 2025新增
              </span>
            )}
            {aiBadge && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, font: '700 10px/1 var(--font-cn)',
                color: aiBadge.fg, background: aiBadge.bg, borderRadius: 'var(--r-full)', padding: '4px 7px',
              }}>
                <Icon name={aiBadge.icon} size={10} /> {aiBadge.label}
              </span>
            )}
            {item.employment_warning && (
              <span
                title={item.employment_warning.note}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, font: '700 10px/1 var(--font-cn)',
                  color: '#9A3412', background: '#FFF1E6', border: '1px solid #FED7AA',
                  borderRadius: 'var(--r-full)', padding: '4px 7px',
                }}
              >
                <Icon name="alert-triangle" size={10} /> 就业预警
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, font: '700 11.5px/1 var(--font-cn)',
              color: lvl.fg, background: lvl.bg, borderRadius: 'var(--r-full)', padding: '4px 10px',
            }}>
              {item.display_level} · {item.level_label}
            </span>
            <span className="chip chip--grey" style={{ height: 22 }}>{item.major_class}</span>
            {needVerify ? (
              <span className="chip chip--accent" style={{ height: 22 }}>
                <Icon name="alert-triangle" size={11} /> 选科需核验
              </span>
            ) : item.subject_requirement.required_all.length > 0 ? (
              <span className="chip chip--cyan" style={{ height: 22 }}>
                <Icon name="check" size={11} /> 选科：{item.subject_requirement.required_all.join('+')}
              </span>
            ) : (
              <span className="chip chip--grey" style={{ height: 22 }}>不限选科</span>
            )}
          </div>
          {item.matched_careers.length > 0 && (
            <div style={{ font: '500 11px/1.4 var(--font-cn)', color: 'var(--t-2nd)', marginTop: 7 }}>
              通向：{item.matched_careers.map(c => c.career_name).join(' · ')}
            </div>
          )}
        </div>
        <MatchRing pct={Math.min(99, item.display_score)} />
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
          background: open ? 'var(--c-blue-wash2)' : 'transparent', color: 'var(--c-blue)',
          font: '600 13px/1 var(--font-cn)', padding: '11px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
      >
        {open ? '收起' : '推荐理由 · 风险 · 报考策略'}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
      </button>

      {open && (
        <div className="rise" style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {item.user_facing_explanation && (
            <div style={{
              font: '500 12.5px/1.6 var(--font-cn)', color: 'var(--c-blue-700)', background: 'var(--c-blue-wash2)',
              borderRadius: 'var(--r-sm)', padding: '10px 12px', borderLeft: '3px solid var(--c-blue)',
              textWrap: 'pretty' as never,
            }}>
              <Icon name="sparkles" size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />
              {item.user_facing_explanation}
            </div>
          )}

          {item.why_recommended.length > 0 && (
            <Section icon="target" color="var(--c-accent-600)" label="为什么推荐">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {item.why_recommended.map((r, i) => (
                  <span key={i} className="chip chip--blue" style={{ height: 24 }}>{r}</span>
                ))}
              </div>
            </Section>
          )}

          {item.risk_warning && (
            <div style={{ font: '600 12px/1.55 var(--font-cn)', color: 'var(--c-accent-600)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <Icon name="alert-triangle" size={14} color="var(--c-accent-600)" style={{ marginTop: 1 }} />
              {item.risk_warning}
            </div>
          )}

          {item.risk_notes.length > 0 && (
            <Section icon="message-circle-warning" color="var(--c-accent-600)" label="风险与现实">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                {item.risk_notes.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, font: '500 12.5px/1.55 var(--font-cn)', color: 'var(--t-body)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-accent)', flex: 'none', marginTop: 7 }} />
                    {r}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {needVerify && (
            <div style={{ font: '500 12px/1.55 var(--font-cn)', color: 'var(--t-body)', background: 'var(--c-accent-wash)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
              该专业通常要求 {item.subject_requirement.required_all.join('+') || '特定选科'}，我们暂未采集到你的选科，请以目标省份和高校当年选科要求为准。
            </div>
          )}

          {item.university_strategy && (
            <Section icon="building-2" color="var(--c-blue)" label="报考策略">
              <div style={{ font: '500 12.5px/1.6 var(--font-cn)', color: 'var(--t-body)', marginTop: 8, textWrap: 'pretty' as never }}>
                {item.university_strategy}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, color, label, children }: { icon: string; color: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={icon} size={15} color={color} />
        <span style={{ font: '700 12.5px/1 var(--font-cn)', color: 'var(--t-title)', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}
