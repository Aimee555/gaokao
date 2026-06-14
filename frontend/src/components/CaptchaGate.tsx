import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { createSession, fetchCaptcha } from '../lib/api';

interface Props {
  onVerified: () => void;
  onCancel: () => void;
}

/**
 * 人机验证弹窗：在首次使用 AI 功能前出现，通过图形验证码换取会话 token。
 * 通过后 onVerified()，token 已由 api 层保存，后续 AI 请求自动携带。
 */
export default function CaptchaGate({ onVerified, onCancel }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCaptcha = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnswer('');
    try {
      const c = await fetchCaptcha();
      setChallengeId(c.challengeId);
      setSvg(c.svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : '验证码加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const submit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSession(challengeId, answer.trim());
      onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : '验证失败');
      await loadCaptcha(); // 失败后换一张新图
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          background: 'var(--bg-card, #fff)',
          borderRadius: 18,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            font: '700 17px/1.4 var(--font-cn)',
            color: 'var(--t-title)',
            textAlign: 'center',
          }}
        >
          请完成人机验证
        </div>
        <div
          style={{
            font: '500 12px/1.55 var(--font-cn)',
            color: 'var(--t-2nd)',
            textAlign: 'center',
          }}
        >
          输入下图中的 4 位字符，即可查看 AI 分析
        </div>

        <button
          type="button"
          onClick={loadCaptcha}
          title="看不清？点击换一张"
          style={{
            border: '1px solid var(--line, #d0d7de)',
            borderRadius: 10,
            padding: 4,
            background: '#fff',
            cursor: 'pointer',
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          dangerouslySetInnerHTML={svg && !loading ? { __html: svg } : undefined}
        >
          {loading || !svg ? '加载中…' : undefined}
        </button>

        <input
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit();
          }}
          maxLength={6}
          autoFocus
          placeholder="输入验证码"
          style={{
            width: '100%',
            textAlign: 'center',
            letterSpacing: 4,
            textTransform: 'uppercase',
            font: '600 18px/1.4 var(--font-cn)',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--line, #d0d7de)',
            outline: 'none',
          }}
        />

        {error && (
          <div
            style={{
              font: '500 12px/1.5 var(--font-cn)',
              color: 'var(--c-accent-600, #cf222e)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="alert-circle" size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            className="btn btn--ghost"
            style={{ flex: 1 }}
            onClick={onCancel}
            disabled={submitting}
          >
            取消
          </button>
          <button
            className="btn btn--accent"
            style={{ flex: 1 }}
            onClick={submit}
            disabled={submitting || !answer.trim()}
          >
            {submitting ? '验证中…' : '验证'}
          </button>
        </div>
      </div>
    </div>
  );
}
