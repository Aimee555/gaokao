import { useState } from 'react';
import Icon from './Icon';
import type { Question, RawAnswer } from '../types';

interface RendererProps {
  question: Question;
  answer: RawAnswer | undefined;
  onChange: (a: RawAnswer) => void;
}

function isAnswered(q: Question, a: RawAnswer | undefined): boolean {
  if (!a) return false;
  switch (q.type) {
    case 'single_choice':
      return !!a.selected_code;
    case 'multi_select':
      return (a.selected_codes?.length ?? 0) >= (q.min_select ?? 1);
    case 'ranking_multi_select':
      return (a.ranked_codes?.length ?? 0) >= (q.min_select ?? 1);
    case 'scale_1_5':
      return typeof a.value === 'number' && a.value >= 1 && a.value <= 5;
    case 'free_text':
      return !!(a.text && a.text.trim().length > 0);
  }
}

export function questionAnswered(q: Question, a: RawAnswer | undefined): boolean {
  if (!q.required) return true;
  return isAnswered(q, a);
}

function CardLine({
  active,
  disabled,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 'var(--r-md)',
        border: '1.5px solid ' + (active ? 'var(--c-blue)' : 'var(--border-2)'),
        background: active ? 'var(--c-blue-wash)' : '#fff',
        boxShadow: active ? 'none' : 'var(--sh-1)',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .15s',
      }}
    >
      <span
        style={{
          flex: 1,
          font: '500 14px/1.4 var(--font-cn)',
          color: 'var(--t-title)',
          textWrap: 'pretty' as never,
        }}
      >
        {children}
      </span>
      {badge}
    </button>
  );
}

function SingleChoice({ question, answer, onChange }: RendererProps) {
  const selected = answer?.selected_code;
  const opts = question.options ?? [];
  const selectedOpt = opts.find(o => o.code === selected);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {opts.map(o => (
        <CardLine
          key={o.code}
          active={selected === o.code}
          onClick={() =>
            onChange({
              question_id: question.id,
              type: 'single_choice',
              selected_code: o.code,
              custom_answer: o.code === selected ? answer?.custom_answer : undefined,
            })
          }
          badge={
            selected === o.code ? <Icon name="check-circle-2" size={20} color="var(--c-blue)" /> : null
          }
        >
          {o.label}
        </CardLine>
      ))}
      {selectedOpt?.allow_custom_text && (
        <input
          autoFocus
          value={answer?.custom_answer ?? ''}
          onChange={e =>
            onChange({
              question_id: question.id,
              type: 'single_choice',
              selected_code: selected,
              custom_answer: e.target.value,
            })
          }
          placeholder="请填写"
          style={{
            height: 42,
            padding: '0 14px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border-2)',
            font: '500 13px/1 var(--font-cn)',
            color: 'var(--t-title)',
            outline: 'none',
            background: 'var(--g-2)',
          }}
        />
      )}
    </div>
  );
}

function MultiSelect({ question, answer, onChange }: RendererProps) {
  const selected = answer?.selected_codes ?? [];
  const opts = question.options ?? [];
  const max = question.max_select ?? Infinity;
  const customOpt = opts.find(o => o.allow_custom_text);
  const customSelected = customOpt ? selected.includes(customOpt.code) : false;

  const toggle = (code: string) => {
    const exists = selected.includes(code);
    const next = exists ? selected.filter(c => c !== code) : selected.length >= max ? selected : [...selected, code];
    onChange({
      question_id: question.id,
      type: 'multi_select',
      selected_codes: next,
      custom_answer: customSelected ? answer?.custom_answer : undefined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          font: '600 12px/1 var(--font-cn)',
          color: 'var(--t-2nd)',
          marginBottom: -4,
        }}
      >
        已选 <span style={{ color: 'var(--c-blue)', fontWeight: 800 }}>{selected.length}</span>
        {Number.isFinite(max) ? ` / ${max}` : ''}
      </div>
      {opts.map(o => {
        const on = selected.includes(o.code);
        const dim = !on && selected.length >= max;
        return (
          <CardLine
            key={o.code}
            active={on}
            disabled={dim}
            onClick={() => toggle(o.code)}
            badge={on ? <Icon name="check-circle-2" size={20} color="var(--c-blue)" /> : null}
          >
            {o.label}
          </CardLine>
        );
      })}
      {customSelected && (
        <input
          autoFocus
          value={answer?.custom_answer ?? ''}
          onChange={e =>
            onChange({
              question_id: question.id,
              type: 'multi_select',
              selected_codes: selected,
              custom_answer: e.target.value,
            })
          }
          placeholder="请填写"
          style={{
            height: 42,
            padding: '0 14px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border-2)',
            font: '500 13px/1 var(--font-cn)',
            color: 'var(--t-title)',
            outline: 'none',
            background: 'var(--g-2)',
          }}
        />
      )}
    </div>
  );
}

function RankingMultiSelect({ question, answer, onChange }: RendererProps) {
  const ranked = answer?.ranked_codes ?? [];
  const opts = question.options ?? [];
  const max = question.max_select ?? 3;

  const toggle = (code: string) => {
    const exists = ranked.indexOf(code);
    let next: string[];
    if (exists >= 0) {
      next = ranked.filter(c => c !== code);
    } else {
      next = ranked.length >= max ? ranked : [...ranked, code];
    }
    onChange({
      question_id: question.id,
      type: 'ranking_multi_select',
      ranked_codes: next,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          font: '600 12px/1.4 var(--font-cn)',
          color: 'var(--t-2nd)',
          marginBottom: -4,
        }}
      >
        点击按重要性顺序选择 <span style={{ color: 'var(--c-blue)', fontWeight: 800 }}>{ranked.length}</span> / {max} ·
        点已选可取消
      </div>
      {opts.map(o => {
        const idx = ranked.indexOf(o.code);
        const on = idx >= 0;
        const full = ranked.length >= max && !on;
        return (
          <CardLine
            key={o.code}
            active={on}
            disabled={full}
            onClick={() => toggle(o.code)}
            badge={
              on ? (
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--c-blue)',
                    color: '#fff',
                    font: '800 14px/1 var(--font-num)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {idx + 1}
                </span>
              ) : null
            }
          >
            {o.label}
          </CardLine>
        );
      })}
    </div>
  );
}

function Scale1to5({ question, answer, onChange }: RendererProps) {
  const val = answer?.value ?? 0;
  const labels = ['很低', '偏低', '中等', '较高', '很高'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const on = val === n;
          return (
            <button
              key={n}
              onClick={() =>
                onChange({ question_id: question.id, type: 'scale_1_5', value: n })
              }
              style={{
                flex: 1,
                height: 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
                borderRadius: 'var(--r-md)',
                border: '1.5px solid ' + (on ? 'var(--c-blue)' : 'var(--border-2)'),
                background: on ? 'var(--c-blue-wash)' : '#fff',
                boxShadow: on ? 'none' : 'var(--sh-1)',
                transition: 'all .15s',
              }}
            >
              <span
                className="num"
                style={{
                  font: '800 20px/1 var(--font-num)',
                  color: on ? 'var(--c-blue)' : 'var(--t-title)',
                }}
              >
                {n}
              </span>
              <span style={{ font: '500 11px/1 var(--font-cn)', color: 'var(--t-2nd)' }}>
                {labels[n - 1]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FreeText({ question, answer, onChange }: RendererProps) {
  const [text, setText] = useState(answer?.text ?? '');
  return (
    <textarea
      value={text}
      onChange={e => {
        setText(e.target.value);
        onChange({ question_id: question.id, type: 'free_text', text: e.target.value });
      }}
      placeholder="请输入"
      style={{
        width: '100%',
        minHeight: 120,
        padding: '12px 14px',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border-2)',
        font: '500 14px/1.55 var(--font-cn)',
        color: 'var(--t-title)',
        outline: 'none',
        background: '#fff',
        resize: 'vertical',
      }}
    />
  );
}

export default function QuestionRenderer({ question, answer, onChange }: RendererProps) {
  switch (question.type) {
    case 'single_choice':
      return <SingleChoice question={question} answer={answer} onChange={onChange} />;
    case 'multi_select':
      return <MultiSelect question={question} answer={answer} onChange={onChange} />;
    case 'ranking_multi_select':
      return <RankingMultiSelect question={question} answer={answer} onChange={onChange} />;
    case 'scale_1_5':
      return <Scale1to5 question={question} answer={answer} onChange={onChange} />;
    case 'free_text':
      return <FreeText question={question} answer={answer} onChange={onChange} />;
  }
}
