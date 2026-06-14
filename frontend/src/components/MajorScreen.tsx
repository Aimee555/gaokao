import { useEffect, useRef, useState } from 'react';
import AppBar from './AppBar';
import Icon from './Icon';
import MajorCard from './MajorCard';
import { postMajorReview } from '../lib/api';
import type {
  FollowupAnswer,
  MajorMatcherResult,
  MajorReviewResponse,
  MatchedMajor,
  QuestionnaireMode,
  RawAnswer,
  ReviewedMajor,
} from '../types';

interface Props {
  mode: QuestionnaireMode;
  answers: RawAnswer[];
  initialMajor: MajorMatcherResult;
  onBack: () => void;
  onRestart: () => void;
}

function asReviewed(m: MatchedMajor): ReviewedMajor {
  return { ...m, display_score: m.score, display_level: m.level, ai_action: 'keep', ai_reason: '', user_facing_explanation: '', risk_warning: '' };
}

function seedFromRules(mr: MajorMatcherResult): MajorReviewResponse {
  return {
    profile_type: '', profile_summary: '', applied_followups: [],
    major_result: mr,
    major_review: {
      available: false, model: 'rule', overall_judgment: '',
      need_followup: mr.followup_required, followup_questions: mr.followup_questions,
      reviewed_majors: [...mr.strong_recommend_majors, ...mr.consider_majors, ...mr.cautious_majors].map(asReviewed),
      divergences: [], guardrail_notes: [],
    },
  };
}

const LEVEL_META: Record<string, { title: string; sub: string }> = {
  A: { title: 'A · 强推荐', sub: '职业相关性强、能力匹配、风险可接受' },
  B: { title: 'B · 可考虑', sub: '整体匹配较好，存在一定门槛' },
  C: { title: 'C · 谨慎考虑', sub: '有相关性，需结合院校/城市/学历再判断' },
};

export default function MajorScreen({ mode, answers, initialMajor, onBack, onRestart }: Props) {
  const [data, setData] = useState<MajorReviewResponse>(() => seedFromRules(initialMajor));
  const [reviewing, setReviewing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const followRef = useRef<FollowupAnswer[]>([]);

  async function load(followups: FollowupAnswer[]) {
    setReviewing(true);
    setError(null);
    try {
      setData(await postMajorReview(mode, answers, followups));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 复核失败，已展示规则结果');
    } finally {
      setReviewing(false);
    }
  }

  useEffect(() => {
    load([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function answer(triggerCode: string, code: string) {
    const next = [...followRef.current.filter(a => a.trigger_code !== triggerCode), { trigger_code: triggerCode, selected_code: code }];
    followRef.current = next;
    load(next);
  }

  const { major_review: rev, major_result: rule } = data;
  const answerable = rev.followup_questions.filter(q => q.options.length > 0);

  // AI 校正后的主列表按 display_level 分组
  const byLevel = { A: [] as ReviewedMajor[], B: [] as ReviewedMajor[], C: [] as ReviewedMajor[] };
  for (const m of rev.reviewed_majors) {
    if (m.display_level === 'A') byLevel.A.push(m);
    else if (m.display_level === 'B') byLevel.B.push(m);
    else if (m.display_level === 'C') byLevel.C.push(m);
  }
  let firstOpened = false;
  const openFirst = () => { if (!firstOpened) { firstOpened = true; return true; } return false; };

  return (
    <div className="screen">
      <AppBar
        onBack={onBack}
        title="专业推荐"
        right={
          <button className="iconbtn" onClick={onRestart} aria-label="重新开始">
            <Icon name="rotate-cw" size={17} />
          </button>
        }
      />

      {/* AI 总判断 / 复核中 */}
      <div className="rise" style={{ margin: '14px 16px 0' }}>
        {reviewing && !rev.available ? (
          <div style={{ padding: '13px 15px', borderRadius: 'var(--r-md)', background: 'var(--c-blue-wash2)', border: '1px solid var(--c-blue-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ai-dots"><i /><i /><i /></span>
            <div style={{ font: '500 12.5px/1.5 var(--font-cn)', color: 'var(--c-blue-700)' }}>先看规则推荐的专业梯队，AI 正在复核校正（约一分钟）…</div>
          </div>
        ) : rev.available ? (
          <div style={{ padding: '14px 15px', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, #0B1E45, #18336e)', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--c-blue), var(--c-cyan))' }}>
                <Icon name="sparkles" size={15} />
              </span>
              <span style={{ font: '700 13px/1 var(--font-cn)' }}>AI 复核意见</span>
              <span style={{ marginLeft: 'auto', font: '600 10px/1 var(--font-cn)', color: 'rgba(255,255,255,.6)' }}>{rev.model}</span>
            </div>
            <div style={{ font: '500 12.5px/1.65 var(--font-cn)', color: 'rgba(255,255,255,.86)', textWrap: 'pretty' as never }}>{rev.overall_judgment}</div>
          </div>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--g-3)', font: '500 12.5px/1.55 var(--font-cn)', color: 'var(--t-body)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="info" size={15} color="var(--t-2nd)" style={{ marginTop: 1 }} />
            {rev.overall_judgment || 'AI 复核未启用，以下为规则引擎结果。'}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 8, font: '500 12px/1.5 var(--font-cn)', color: 'var(--c-accent-600)', display: 'flex', gap: 7, alignItems: 'center' }}>
            <Icon name="alert-triangle" size={13} color="var(--c-accent-600)" /> {error}（已展示规则结果）
          </div>
        )}
      </div>

      {/* 动态追问 */}
      {answerable.length > 0 && (
        <div className="rise" style={{ margin: '12px 16px 0' }}>
          <div style={{ background: '#fff', border: '1px solid var(--c-blue-soft)', borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="help-circle" size={16} color="var(--c-blue)" />
              <span style={{ font: '700 13.5px/1 var(--font-cn)', color: 'var(--t-title)' }}>回答几个问题，让专业推荐更准</span>
              {reviewing && <span className="ai-dots" style={{ marginLeft: 'auto' }}><i /><i /><i /></span>}
            </div>
            {answerable.map(q => (
              <div key={q.trigger_code} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ font: '600 13px/1.5 var(--font-cn)', color: 'var(--t-title)' }}>{q.question}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {q.options.map(opt => (
                    <button key={opt.code} disabled={reviewing} onClick={() => answer(q.trigger_code, opt.code)}
                      style={{
                        cursor: reviewing ? 'default' : 'pointer', font: '500 12.5px/1.3 var(--font-cn)',
                        color: 'var(--c-blue-700)', background: 'var(--c-blue-wash)', border: '1px solid var(--c-blue-soft)',
                        borderRadius: 'var(--r-full)', padding: '9px 14px', opacity: reviewing ? 0.55 : 1, textAlign: 'left',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {data.applied_followups.length > 0 && (
              <div style={{ font: '500 11.5px/1.4 var(--font-cn)', color: 'var(--c-cyan-ink)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Icon name="check-circle-2" size={13} color="var(--c-cyan-ink)" /> 已根据你的 {data.applied_followups.length} 个回答更新专业推荐
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 18 }}>
        {rev.reviewed_majors.length === 0 && (
          <EmptyNote>暂未生成可推荐的专业梯队，可回到上一步调整或重新测评。</EmptyNote>
        )}

        {(['A', 'B', 'C'] as const).map(lv =>
          byLevel[lv].length > 0 ? (
            <div key={lv} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: lv === 'A' ? 0 : 6 }}>
                <span style={{ font: '700 16px/1 var(--font-cn)', color: 'var(--t-title)' }}>{LEVEL_META[lv].title}</span>
                <span style={{ font: '500 11.5px/1 var(--font-cn)', color: 'var(--t-2nd)' }}>{LEVEL_META[lv].sub}</span>
              </div>
              {byLevel[lv].map(m => <MajorCard key={m.major_id} item={m} defaultOpen={openFirst()} />)}
            </div>
          ) : null,
        )}

        {/* 深造型 */}
        {rule.deep_study_majors.length > 0 && (
          <Collapse icon="microscope" title={`深造型专业（${rule.deep_study_majors.length}）`} subtitle="更适合愿意读研/读博的同学">
            {rule.deep_study_majors.map(d => (
              <MiniRow key={d.major_id} name={d.major_name} reason={d.reason} />
            ))}
          </Collapse>
        )}

        {/* 选科不符 */}
        {rule.ineligible_majors.length > 0 && (
          <Collapse icon="ban" title={`选科不符 / 不可报考（${rule.ineligible_majors.length}）`} subtitle="以目标省份和高校当年选科要求为准">
            {rule.ineligible_majors.map(m => (
              <MiniRow key={m.major_id} name={m.major_name} tag={m.subject_requirement.required_all.join('+')} reason={m.reason} />
            ))}
          </Collapse>
        )}

        {/* 不推荐 */}
        {rule.not_recommended_majors.length > 0 && (
          <Collapse icon="x-circle" title={`不建议优先选择（${rule.not_recommended_majors.length}）`}>
            {rule.not_recommended_majors.slice(0, 8).map(m => (
              <MiniRow key={m.major_id} name={m.major_name} reason={m.reason} />
            ))}
          </Collapse>
        )}

        {/* AI vs 规则 分歧表 */}
        {rev.divergences.length > 0 && (
          <Collapse icon="git-compare" title={`AI 与规则的分歧（${rev.divergences.length}）`} subtitle="调参视角：AI 主动改动处">
            {rev.divergences.map(d => (
              <div key={d.major_id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 0', borderBottom: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 12.5px/1 var(--font-cn)', color: 'var(--t-title)' }}>{d.major_name}</span>
                  <span className="num" style={{ font: '600 11px/1 var(--font-num)', color: 'var(--t-2nd)' }}>规则 {d.rule_level}/{d.rule_score}</span>
                  <Icon name="arrow-right" size={12} color="var(--t-2nd)" />
                  <span style={{ font: '700 11px/1 var(--font-cn)', color: 'var(--c-blue-700)' }}>{d.ai_action} · {d.display_level}/{d.display_score}</span>
                </div>
                <div style={{ font: '500 11.5px/1.5 var(--font-cn)', color: 'var(--t-body)' }}>{d.ai_reason}</div>
              </div>
            ))}
          </Collapse>
        )}

        <div style={{ font: '500 11px/1.5 var(--font-cn)', color: 'var(--t-2nd)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Icon name="info" size={12} style={{ marginTop: 1, flex: 'none' }} />
          选科要求为通用模板，正式报考请以所在省考试院与目标高校当年招生专业选考要求为准。
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 6, marginBottom: 8 }}>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onBack}>
            <Icon name="arrow-left" size={16} /> 职业路径
          </button>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onRestart}>
            <Icon name="rotate-cw" size={16} /> 重新开始
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)', padding: '22px 18px', textAlign: 'center', color: 'var(--t-body)', font: '500 13px/1.6 var(--font-cn)' }}>
      {children}
    </div>
  );
}

function Collapse({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <details style={{ background: 'var(--g-2)', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <summary style={{ cursor: 'pointer', padding: '12px 14px', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--t-body)" />
        <span style={{ font: '600 13px/1.3 var(--font-cn)', color: 'var(--t-body)' }}>{title}</span>
        {subtitle && <span style={{ font: '500 11px/1.3 var(--font-cn)', color: 'var(--t-2nd)' }}>· {subtitle}</span>}
      </summary>
      <div style={{ padding: '2px 14px 12px' }}>{children}</div>
    </details>
  );
}

function MiniRow({ name, tag, reason }: { name: string; tag?: string; reason?: string }) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px dashed var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ font: '600 13px/1.3 var(--font-cn)', color: 'var(--t-title)' }}>{name}</span>
        {tag && <span className="chip chip--grey" style={{ height: 20 }}>需 {tag}</span>}
      </div>
      {reason && <div style={{ font: '500 12px/1.5 var(--font-cn)', color: 'var(--t-body)', marginTop: 4 }}>{reason}</div>}
    </div>
  );
}
