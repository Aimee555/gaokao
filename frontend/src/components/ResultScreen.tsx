import type { RefObject } from 'react';
import AppBar from './AppBar';
import Icon from './Icon';
import IndustryCard from './IndustryCard';
import AIAdvicePanel from './AIAdvicePanel';
import type { QuestionnaireMode, RecommendResponse } from '../types';

interface Props {
  result: RecommendResponse;
  mode: QuestionnaireMode;
  onRestart: () => void;
  onRetake: () => void;
  onCareers: () => void;
  scrollRef: RefObject<HTMLDivElement>;
}

export default function ResultScreen({ result, mode, onRestart, onRetake, onCareers, scrollRef }: Props) {
  const top = result.recommended_industries.slice(0, 3);

  const ctxLines: string[] = [
    '请基于以下高考生的画像和系统给出的产业推荐，生成 200-300 字的个性化选专业建议（先点明画像类型，再说明匹配逻辑，最后给 1-2 条诚实的行动提醒）。',
    `画像类型：${result.profile_type}。`,
    `画像摘要：${result.profile_summary}`,
    `问卷版本：${mode === 'quick' ? '快速 16 题' : '深度 60 题'}。`,
  ];
  if (top.length > 0) {
    ctxLines.push(
      `Top 推荐产业：${top
        .map(t => `${t.industry_name}(${t.level_label}, ${t.score}分, 含专业:${t.related_majors.slice(0, 3).join('/')})`)
        .join('；')}。`,
    );
  } else {
    ctxLines.push('系统未找到强匹配的产业方向，请基于画像类型给出宽口径建议。');
  }
  const contextPrompt = ctxLines.join('\n');

  return (
    <div className="screen" ref={scrollRef}>
      <AppBar
        onBack={onRetake}
        title="你的画像与推荐"
        right={
          <button className="iconbtn" onClick={onRestart} aria-label="重新开始">
            <Icon name="rotate-cw" size={17} />
          </button>
        }
      />

      <div
        className="rise"
        style={{
          margin: '14px 16px 0',
          padding: '16px',
          borderRadius: 'var(--r-md)',
          background: 'linear-gradient(135deg, #0B1E45, #18336e)',
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              font: '600 11px/1 var(--font-cn)',
              color: 'rgba(255,255,255,.6)',
              letterSpacing: '.06em',
              whiteSpace: 'nowrap',
            }}
          >
            画像类型
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              font: '600 11px/1 var(--font-cn)',
              color: '#fff',
              background: 'rgba(255,255,255,.14)',
              borderRadius: 'var(--r-full)',
              padding: '5px 10px',
            }}
          >
            <Icon name={mode === 'quick' ? 'zap' : 'brain'} size={12} color="var(--c-cyan)" />
            {mode === 'quick' ? '快测' : '深度'}
          </span>
        </div>
        <div
          style={{
            font: '700 22px/1.3 var(--font-cn)',
            color: '#fff',
            marginBottom: 8,
          }}
        >
          {result.profile_type}
        </div>
        <div
          style={{
            font: '500 13px/1.6 var(--font-cn)',
            color: 'rgba(255,255,255,.82)',
            textWrap: 'pretty' as never,
          }}
        >
          {result.profile_summary}
        </div>
      </div>

      {result.subject_warnings && result.subject_warnings.length > 0 && (
        <div
          className="rise"
          style={{
            margin: '12px 16px 0',
            padding: '12px 14px',
            borderRadius: 'var(--r-md)',
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="alert-triangle" size={15} color="#C2410C" />
            <span style={{ font: '700 13px/1 var(--font-cn)', color: '#9A3412' }}>选科填写提醒</span>
          </div>
          {result.subject_warnings.map((w, i) => (
            <div
              key={i}
              style={{ font: '500 12.5px/1.6 var(--font-cn)', color: '#7C2D12', textWrap: 'pretty' as never }}
            >
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="section-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: '700 17px/1 var(--font-cn)', color: 'var(--t-title)' }}>
            Top {top.length} 推荐产业方向
          </span>
          {top.length > 0 && (
            <span style={{ font: '500 12px/1 var(--font-cn)', color: 'var(--t-2nd)' }}>
              按匹配度排序
            </span>
          )}
        </div>

        {top.length > 0 ? (
          top.map((it, i) => (
            <IndustryCard key={it.industry_id} item={it} defaultOpen={i === 0} />
          ))
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1px dashed var(--border-2)',
              borderRadius: 'var(--r-md)',
              padding: '22px 18px',
              textAlign: 'center',
              color: 'var(--t-body)',
              font: '500 13px/1.6 var(--font-cn)',
            }}
          >
            暂未找到强匹配的产业方向。
            <br />
            可以重新测评或让下方 AI 给你一些建议。
          </div>
        )}

        <button
          className="btn btn--blue btn--block"
          style={{ height: 52, marginTop: 2 }}
          onClick={onCareers}
        >
          <Icon name="route" size={18} /> 下一步 · 看职业路径推荐
          <Icon name="arrow-right" size={17} />
        </button>

        <AIAdvicePanel contextPrompt={contextPrompt} scrollRef={scrollRef} />

        <div style={{ display: 'flex', gap: 10, marginTop: 6, marginBottom: 8 }}>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onRestart}>
            <Icon name="rotate-cw" size={16} /> 重新开始
          </button>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onRetake}>
            <Icon name="refresh-cw" size={16} /> 重新测评
          </button>
        </div>
      </div>
    </div>
  );
}
