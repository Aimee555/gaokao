import Icon from './Icon';
import { META } from '../lib/constants';
import type { QuestionnaireMode } from '../types';

interface Props {
  onStart: (mode: QuestionnaireMode) => void;
}

const VALUES = [
  { icon: 'list-checks', title: '答完问卷，自动生成你的画像', sub: '兴趣、能力、价值观、风险偏好多维标签' },
  { icon: 'flag', title: '对照「十五五」战略产业方向', sub: '23 个产业方向的匹配分数与等级' },
  { icon: 'sparkles', title: 'AI 给你一份诚实的选专业建议', sub: '含就业现实提示，不画大饼' },
];

export default function HomeScreen({ onStart }: Props) {
  return (
    <div className="screen">
      <div
        style={{
          background: 'linear-gradient(160deg, #0B1E45 0%, #14306e 65%, #1b3f8f 100%)',
          color: '#fff',
          padding: '34px 22px 30px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -50,
            top: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(6,182,212,.5), transparent 65%)',
            filter: 'blur(6px)',
          }}
        />
        <div style={{ position: 'relative' }} className="rise">
          <div className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#cfe0ff', height: 26 }}>
            <Icon name="compass" size={13} /> 国家战略 · 专业匹配
          </div>
          <h1 style={{ margin: '16px 0 10px', font: '700 32px/1.16 var(--font-cn)', letterSpacing: '-.01em' }}>
            趋势选专业
          </h1>
          <p style={{ margin: 0, font: '500 15px/1.55 var(--font-cn)', color: 'rgba(255,255,255,.8)', maxWidth: 290 }}>
            跟着国家战略，选对你的专业。<br />画像 × 产业，给你最匹配的方向。
          </p>
        </div>
      </div>

      <div className="section-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 22 }}>
        {VALUES.map((v, i) => (
          <div
            key={i}
            className="rise"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--sh-1)',
              animationDelay: `${0.05 * i}s`,
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                flex: 'none',
                borderRadius: 13,
                background: i === 2 ? 'var(--c-accent-wash)' : 'var(--c-blue-wash)',
                color: i === 2 ? 'var(--c-accent-600)' : 'var(--c-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={v.icon} size={23} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 14.5px/1.3 var(--font-cn)', color: 'var(--t-title)' }}>{v.title}</div>
              <div style={{ font: '500 12px/1.4 var(--font-cn)', color: 'var(--t-2nd)', marginTop: 3 }}>{v.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }} />

      <div className="section-pad" style={{ paddingTop: 8, paddingBottom: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn btn--accent btn--block"
          style={{ height: 54, fontSize: 17 }}
          onClick={() => onStart('quick')}
        >
          <Icon name="zap" size={18} /> 5 分钟快测（16 题）
        </button>
        <button
          className="btn btn--ghost btn--block"
          style={{ height: 50, fontSize: 15 }}
          onClick={() => onStart('deep')}
        >
          <Icon name="brain" size={17} /> 15 分钟深度画像（60 题）
        </button>
        <div style={{ textAlign: 'center', marginTop: 4, font: '500 12px/1.5 var(--font-cn)', color: 'var(--t-2nd)' }}>
          快测适合初次了解 · 深度版结果更准 · 无需注册
        </div>
      </div>

      <div style={{ padding: '14px 20px 22px', borderTop: '1px solid var(--border)', background: 'var(--g-2)' }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 8 }}>
          <Icon name="book-marked" size={14} color="var(--t-2nd)" style={{ marginTop: 1 }} />
          <span style={{ font: '500 11px/1.5 var(--font-cn)', color: 'var(--t-2nd)' }}>{META.sources}</span>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 8 }}>
          <Icon name="info" size={14} color="var(--t-2nd)" style={{ marginTop: 1 }} />
          <span style={{ font: '500 11px/1.5 var(--font-cn)', color: 'var(--t-2nd)' }}>{META.disclaimer}</span>
        </div>
        <div style={{ font: '500 11px/1 var(--font-cn)', color: 'var(--t-dis)', paddingLeft: 21 }}>{META.updated}</div>
      </div>
    </div>
  );
}
