import Icon from './Icon';

interface Props {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

export default function LoadingScreen({ message, error, onRetry, onBack }: Props) {
  if (error) {
    return (
      <div className="screen">
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
          <Icon name="alert-circle" size={42} color="var(--c-accent-600)" />
          <div
            style={{
              font: '500 14px/1.55 var(--font-cn)',
              color: 'var(--t-body)',
              textAlign: 'center',
              maxWidth: 260,
            }}
          >
            {error}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {onRetry && (
              <button className="btn btn--accent" onClick={onRetry}>
                <Icon name="rotate-cw" size={16} /> 重试
              </button>
            )}
            {onBack && (
              <button className="btn btn--ghost" onClick={onBack}>
                返回首页
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 18,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--c-blue), var(--c-cyan))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--sh-blue)',
          }}
        >
          <Icon name="sparkles" size={28} />
        </div>
        <div
          style={{
            font: '700 18px/1.4 var(--font-cn)',
            color: 'var(--t-title)',
            textAlign: 'center',
          }}
        >
          正在生成你的画像
        </div>
        <div
          style={{
            font: '500 13px/1.55 var(--font-cn)',
            color: 'var(--t-2nd)',
            textAlign: 'center',
            maxWidth: 240,
          }}
        >
          {message ?? '匹配国家「十五五」战略产业方向，约 3 秒…'}
        </div>
        <div className="ai-dots" style={{ marginTop: 6 }}>
          <i /><i /><i />
        </div>
      </div>
    </div>
  );
}
