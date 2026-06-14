import { useEffect, useRef, useState } from 'react';
import AppBar from './AppBar';
import Icon from './Icon';
import CareerCard from './CareerCard';
import { postAiReview } from '../lib/api';
import type {
  AiReviewResponse,
  CareerMatcherResult,
  FollowupAnswer,
  MatchedCareer,
  QuestionnaireMode,
  RawAnswer,
  ReviewedCareer,
} from '../types';

interface Props {
  mode: QuestionnaireMode;
  answers: RawAnswer[];
  initialCareer: CareerMatcherResult; // 来自 /recommend 的规则职业结果，先即时展示
  onBack: () => void;
  onMajors: () => void;
  onRestart: () => void;
}

// 规则职业 → 展示用形态（AI 复核前的占位）
function asReviewed(c: MatchedCareer): ReviewedCareer {
  return { ...c, display_score: c.score, display_level: c.level, ai_action: 'keep', ai_reason: '', user_facing_explanation: '', risk_warning: '' };
}

function seedFromRules(cr: CareerMatcherResult): AiReviewResponse {
  return {
    profile_type: '',
    profile_summary: '',
    applied_followups: [],
    career_result: cr,
    ai_review: {
      available: false,
      model: 'rule',
      overall_judgment: '',
      need_followup: cr.followup_required,
      followup_questions: cr.followup_questions,
      reviewed_careers: cr.recommended_careers.map(asReviewed),
      moved_to_backup: cr.backup_careers,
      divergences: [],
      guardrail_notes: [],
    },
  };
}

export default function CareerScreen({ mode, answers, initialCareer, onBack, onMajors, onRestart }: Props) {
  // 先用规则结果即时渲染，AI 复核(~数十秒)返回后再无缝替换
  const [data, setData] = useState<AiReviewResponse>(() => seedFromRules(initialCareer));
  const [reviewing, setReviewing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const followRef = useRef<FollowupAnswer[]>([]);

  async function load(followups: FollowupAnswer[]) {
    setReviewing(true);
    setError(null);
    try {
      const res = await postAiReview(mode, answers, followups);
      setData(res);
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
    const next = [
      ...followRef.current.filter(a => a.trigger_code !== triggerCode),
      { trigger_code: triggerCode, selected_code: code },
    ];
    followRef.current = next;
    load(next);
  }

  const { ai_review, career_result } = data;
  const careers = ai_review.reviewed_careers;
  const answerable = ai_review.followup_questions.filter(q => q.options.length > 0);
  const clarifying = ai_review.followup_questions.filter(q => q.options.length === 0);

  return (
    <div className="screen">
      <AppBar
        onBack={onBack}
        title="职业路径推荐"
        right={
          <button className="iconbtn" onClick={onRestart} aria-label="重新开始">
            <Icon name="rotate-cw" size={17} />
          </button>
        }
      />

      {/* AI 总判断 */}
      <div className="rise" style={{ margin: '14px 16px 0' }}>
        {reviewing && !ai_review.available ? (
          <div
            style={{
              padding: '13px 15px', borderRadius: 'var(--r-md)',
              background: 'var(--c-blue-wash2)', border: '1px solid var(--c-blue-soft)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span className="ai-dots"><i /><i /><i /></span>
            <div style={{ font: '500 12.5px/1.5 var(--font-cn)', color: 'var(--c-blue-700)' }}>
              先看规则推荐，AI 正在复核校正（约需十几秒）…
            </div>
          </div>
        ) : ai_review.available ? (
          <div
            style={{
              padding: '14px 15px',
              borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, #0B1E45, #18336e)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--c-blue), var(--c-cyan))',
                }}
              >
                <Icon name="sparkles" size={15} />
              </span>
              <span style={{ font: '700 13px/1 var(--font-cn)' }}>AI 复核意见</span>
              <span style={{ marginLeft: 'auto', font: '600 10px/1 var(--font-cn)', color: 'rgba(255,255,255,.6)' }}>
                {ai_review.model}
              </span>
            </div>
            <div style={{ font: '500 12.5px/1.65 var(--font-cn)', color: 'rgba(255,255,255,.86)', textWrap: 'pretty' as never }}>
              {ai_review.overall_judgment}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--g-3)',
              font: '500 12.5px/1.55 var(--font-cn)', color: 'var(--t-body)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}
          >
            <Icon name="info" size={15} color="var(--t-2nd)" style={{ marginTop: 1 }} />
            {ai_review.overall_judgment || 'AI 复核未启用，以下为规则引擎结果。'}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 8, font: '500 12px/1.5 var(--font-cn)', color: 'var(--c-accent-600)', display: 'flex', gap: 7, alignItems: 'center' }}>
            <Icon name="alert-triangle" size={13} color="var(--c-accent-600)" /> {error}（已展示规则结果）
          </div>
        )}
      </div>

      {/* 动态追问 */}
      {(answerable.length > 0 || clarifying.length > 0) && (
        <div className="rise" style={{ margin: '12px 16px 0' }}>
          <div
            style={{
              background: '#fff', border: '1px solid var(--c-blue-soft)', borderRadius: 'var(--r-md)',
              boxShadow: 'var(--sh-1)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 14,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="help-circle" size={16} color="var(--c-blue)" />
              <span style={{ font: '700 13.5px/1 var(--font-cn)', color: 'var(--t-title)' }}>
                回答几个问题，让推荐更准
              </span>
              {reviewing && <span className="ai-dots" style={{ marginLeft: 'auto' }}><i /><i /><i /></span>}
            </div>

            {answerable.map(q => (
              <div key={q.trigger_code} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ font: '600 13px/1.5 var(--font-cn)', color: 'var(--t-title)' }}>{q.question}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {q.options.map(opt => (
                    <button
                      key={opt.code}
                      disabled={reviewing}
                      onClick={() => answer(q.trigger_code, opt.code)}
                      style={{
                        cursor: reviewing ? 'default' : 'pointer',
                        font: '500 12.5px/1.3 var(--font-cn)',
                        color: 'var(--c-blue-700)',
                        background: 'var(--c-blue-wash)',
                        border: '1px solid var(--c-blue-soft)',
                        borderRadius: 'var(--r-full)',
                        padding: '9px 14px',
                        opacity: reviewing ? 0.55 : 1,
                        textAlign: 'left',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {clarifying.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: answerable.length ? 4 : 0 }}>
                {clarifying.map((q, i) => (
                  <div key={i} style={{ font: '500 12px/1.5 var(--font-cn)', color: 'var(--t-2nd)', display: 'flex', gap: 7 }}>
                    <Icon name="message-circle" size={13} color="var(--t-2nd)" style={{ marginTop: 1, flex: 'none' }} />
                    {q.question}
                  </div>
                ))}
              </div>
            )}

            {data.applied_followups.length > 0 && (
              <div style={{ font: '500 11.5px/1.4 var(--font-cn)', color: 'var(--c-cyan-ink)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Icon name="check-circle-2" size={13} color="var(--c-cyan-ink)" />
                已根据你的 {data.applied_followups.length} 个回答更新推荐
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 18 }}>
        <SectionTitle title={`推荐职业路径 Top ${careers.length}`} sub="结合产业方向 + 能力匹配" />
        {careers.length > 0 ? (
          careers.map((c, i) => <CareerCard key={c.career_id} item={c} defaultOpen={i === 0} />)
        ) : (
          <EmptyNote>暂未找到合适的职业路径，可回到上一步调整或重新测评。</EmptyNote>
        )}

        {/* 深造路径 */}
        {career_result.deep_study_paths.length > 0 && (
          <CollapseList
            icon="microscope"
            title={`需深造路径（${career_result.deep_study_paths.length}）`}
            subtitle="学历门槛较高，适合愿意读研/读博的同学"
          >
            {career_result.deep_study_paths.map(d => (
              <MiniRow
                key={d.career_id}
                name={d.career_name}
                tag={d.min_education}
                reason={d.reason}
                majors={d.entry_majors}
              />
            ))}
          </CollapseList>
        )}

        {/* 备选 */}
        {ai_review.moved_to_backup.length > 0 && (
          <CollapseList icon="layers" title={`备选方向（${ai_review.moved_to_backup.length}）`}>
            {ai_review.moved_to_backup.map(b => (
              <MiniRow key={b.career_id} name={b.career_name} reason={b.reason} />
            ))}
          </CollapseList>
        )}

        {/* AI vs 规则 分歧表（调参视角） */}
        {ai_review.divergences.length > 0 && (
          <CollapseList icon="git-compare" title={`AI 与规则的分歧（${ai_review.divergences.length}）`} subtitle="调参视角：AI 主动改动处，可据此校准规则">
            {ai_review.divergences.map(d => (
              <div key={d.career_id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 0', borderBottom: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 12.5px/1 var(--font-cn)', color: 'var(--t-title)' }}>{d.career_name}</span>
                  <span className="num" style={{ font: '600 11px/1 var(--font-num)', color: 'var(--t-2nd)' }}>
                    规则 {d.rule_rank ? `#${d.rule_rank} ` : ''}{d.rule_level}/{d.rule_score}
                  </span>
                  <Icon name="arrow-right" size={12} color="var(--t-2nd)" />
                  <span style={{ font: '700 11px/1 var(--font-cn)', color: 'var(--c-blue-700)' }}>
                    {d.ai_action} · {d.display_level}/{d.display_score}
                  </span>
                </div>
                <div style={{ font: '500 11.5px/1.5 var(--font-cn)', color: 'var(--t-body)' }}>{d.ai_reason}</div>
              </div>
            ))}
          </CollapseList>
        )}

        {ai_review.guardrail_notes.length > 0 && (
          <div style={{ font: '500 11px/1.5 var(--font-cn)', color: 'var(--t-2nd)' }}>
            <Icon name="shield" size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
            护栏：{ai_review.guardrail_notes.join('；')}
          </div>
        )}

        <button className="btn btn--blue btn--block" style={{ height: 52, marginTop: 2 }} onClick={onMajors}>
          <Icon name="graduation-cap" size={18} /> 下一步 · 看专业推荐
          <Icon name="arrow-right" size={17} />
        </button>

        <div style={{ display: 'flex', gap: 10, marginTop: 6, marginBottom: 8 }}>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onBack}>
            <Icon name="arrow-left" size={16} /> 产业方向
          </button>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onRestart}>
            <Icon name="rotate-cw" size={16} /> 重新开始
          </button>
        </div>
      </div>
    </div>
  );
}


function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ font: '700 17px/1 var(--font-cn)', color: 'var(--t-title)' }}>{title}</span>
      {sub && <span style={{ font: '500 12px/1 var(--font-cn)', color: 'var(--t-2nd)' }}>{sub}</span>}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)',
        padding: '22px 18px', textAlign: 'center', color: 'var(--t-body)', font: '500 13px/1.6 var(--font-cn)',
      }}
    >
      {children}
    </div>
  );
}

function CollapseList({
  icon, title, subtitle, children,
}: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
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

function MiniRow({ name, tag, reason, majors }: { name: string; tag?: string; reason?: string; majors?: string[] }) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px dashed var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ font: '600 13px/1.3 var(--font-cn)', color: 'var(--t-title)' }}>{name}</span>
        {tag && <span className="chip chip--grey" style={{ height: 20 }}>{tag}</span>}
      </div>
      {reason && <div style={{ font: '500 12px/1.5 var(--font-cn)', color: 'var(--t-body)', marginTop: 4 }}>{reason}</div>}
      {majors && majors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {majors.slice(0, 6).map((m, i) => (
            <span key={i} className="chip chip--cyan" style={{ height: 20, fontSize: 11 }}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}
