import { useEffect, useState } from 'react';
import AppBar from './AppBar';
import Icon from './Icon';
import QuestionRenderer, { questionAnswered } from './QuestionRenderer';
import { fetchQuestionnaire } from '../lib/api';
import type {
  Questionnaire,
  QuestionnaireMode,
  RawAnswer,
} from '../types';

interface Props {
  mode: QuestionnaireMode;
  onSubmit: (answers: RawAnswer[]) => void;
  onBack: () => void;
}

export default function QuestionnaireScreen({ mode, onSubmit, onBack }: Props) {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, RawAnswer>>({});

  useEffect(() => {
    let alive = true;
    fetchQuestionnaire(mode)
      .then(q => {
        if (alive) setQuestionnaire(q);
      })
      .catch(err => {
        if (alive) setLoadError(err instanceof Error ? err.message : '问卷加载失败');
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  if (loadError) {
    return (
      <div className="screen">
        <AppBar onBack={onBack} title="兴趣画像" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            gap: 16,
          }}
        >
          <Icon name="alert-circle" size={36} color="var(--c-accent-600)" />
          <div style={{ font: '500 14px/1.55 var(--font-cn)', color: 'var(--t-body)', textAlign: 'center' }}>
            {loadError}
          </div>
          <button className="btn btn--ghost" onClick={onBack}>返回首页</button>
        </div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="screen">
        <AppBar onBack={onBack} title="兴趣画像" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--t-2nd)',
            font: '500 13px/1 var(--font-cn)',
          }}
        >
          <span className="ai-dots"><i /><i /><i /></span>
          <span style={{ marginLeft: 10 }}>加载问卷中…</span>
        </div>
      </div>
    );
  }

  const total = questionnaire.questions.length;
  const q = questionnaire.questions[index];
  const ans = answers[q.id];
  const pct = Math.round(((index + 1) / total) * 100);
  const isFirst = index === 0;
  const isLast = index >= total - 1;
  const canAdvance = questionAnswered(q, ans);

  const setAnswer = (a: RawAnswer) => {
    setAnswers(prev => ({ ...prev, [q.id]: a }));
  };

  const prev = () => {
    if (!isFirst) setIndex(i => i - 1);
  };
  const next = () => {
    if (!canAdvance) return;
    if (isLast) {
      const all = questionnaire.questions
        .map(qq => answers[qq.id])
        .filter((x): x is RawAnswer => !!x);
      onSubmit(all);
    } else {
      setIndex(i => i + 1);
    }
  };

  return (
    <div className="screen">
      <AppBar
        onBack={onBack}
        title={mode === 'quick' ? '5 分钟快测' : '15 分钟深度画像'}
        right={
          <span
            className="num"
            style={{ font: '600 13px/1 var(--font-num)', color: 'var(--t-2nd)', paddingRight: 4 }}
          >
            {index + 1} / {total}
          </span>
        }
      />
      <div style={{ padding: '0 16px' }}>
        <div className="progress">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="section-pad" style={{ paddingTop: 14, paddingBottom: 12 }}>
        <div key={index} className="rise" style={{ marginBottom: 18 }}>
          <div
            style={{
              font: '600 11.5px/1 var(--font-cn)',
              color: 'var(--c-blue)',
              letterSpacing: '.08em',
              marginBottom: 10,
            }}
          >
            {q.module} · 第 {index + 1} 题
          </div>
          <h2
            style={{
              font: '700 19px/1.45 var(--font-cn)',
              color: 'var(--t-title)',
              margin: 0,
              textWrap: 'pretty' as never,
            }}
          >
            {q.question}
          </h2>
          {q.note && (
            <div
              style={{
                font: '500 12px/1.5 var(--font-cn)',
                color: 'var(--t-2nd)',
                marginTop: 8,
                background: 'var(--g-2)',
                borderRadius: 'var(--r-sm)',
                padding: '8px 10px',
              }}
            >
              {q.note}
            </div>
          )}
        </div>

        <QuestionRenderer question={q} answer={ans} onChange={setAnswer} />
      </div>

      <div
        style={{
          padding: '12px 18px 22px',
          display: 'flex',
          gap: 10,
          borderTop: '1px solid var(--border)',
          background: 'var(--g-2)',
        }}
      >
        <button
          className="btn btn--ghost"
          style={{ flex: 1, height: 46, opacity: isFirst ? 0.4 : 1 }}
          disabled={isFirst}
          onClick={prev}
        >
          <Icon name="arrow-left" size={16} /> 上一题
        </button>
        <button
          className="btn btn--accent"
          style={{ flex: 1, height: 46, opacity: canAdvance ? 1 : 0.4 }}
          disabled={!canAdvance}
          onClick={next}
        >
          {isLast ? '查看推荐' : '下一题'} <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
}
