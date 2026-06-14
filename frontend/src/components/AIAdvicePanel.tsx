import { useRef, useState, type RefObject } from 'react';
import Icon from './Icon';
import Typewriter from './Typewriter';
import { chat } from '../lib/api';
import { track } from '../lib/analytics';
import type { ChatMessage } from '../types';

interface Props {
  contextPrompt: string;
  scrollRef: RefObject<HTMLDivElement>;
}

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  animate?: boolean;
}

const SYSTEM_PROMPT =
  '你是一位务实、温暖、专业的高考志愿规划顾问，面向 17-19 岁考生和家长。语言通俗、鼓励但不浮夸，不堆砌套话。每次回答控制在 250 字以内。' +
  '只讨论专业、学科、产业方向、国家政策、职业前景相关话题；不预测任何院校录取分数线，被问到时引导考生查询所在省考试院官网；不确定的信息要明确说明不确定；' +
  '必须诚实：国家战略需要不等于个人就业容易，对深造导向专业要明确提示读研规划；不要回避产业的竞争强度、城市集中度、读研依赖等现实因素。' +
  '请直接输出纯文本，不要使用任何 Markdown 符号（不要出现 #、*、-、> 等），需要分点时用换行加"· "开头。';

const QUICK_QUESTIONS = [
  '这几个产业里我最应该优先看哪个？',
  '我应该规划读研吗？',
  '换个产业方向还可以选什么？',
];

export default function AIAdvicePanel({ contextPrompt, scrollRef }: Props) {
  const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState('');
  const historyRef = useRef<ChatMessage[]>([]);

  const scroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  async function ask(userText: string, isFirst: boolean) {
    track('ai_chat', { first: isFirst });
    setError(null);
    setBusy(true);

    if (isFirst) {
      historyRef.current = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: contextPrompt },
      ];
    } else {
      historyRef.current.push({ role: 'user', content: userText });
      setChatMessages(c => [...c, { role: 'user', content: userText }]);
    }
    setTimeout(scroll, 30);

    try {
      const reply = await chat(historyRef.current);
      historyRef.current.push({ role: 'assistant', content: reply });
      setChatMessages(c => [...c, { role: 'assistant', content: reply, animate: true }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI 暂时没能给出建议，请稍后重试。';
      setError(msg);
    } finally {
      setBusy(false);
      setTimeout(scroll, 40);
    }
  }

  if (!started) {
    return (
      <button
        className="btn btn--accent btn--block"
        style={{ height: 52, marginTop: 4 }}
        onClick={() => {
          setStarted(true);
          ask('', true);
        }}
      >
        <Icon name="sparkles" size={18} /> 让 AI 给我一份个性化建议
      </button>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--sh-1)',
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--c-blue), var(--c-cyan))',
            color: '#fff',
          }}
        >
          <Icon name="sparkles" size={17} />
        </span>
        <span style={{ font: '700 14px/1 var(--font-cn)', color: 'var(--t-title)' }}>AI 个性化建议</span>
      </div>

      {chatMessages.map((m, i) =>
        m.role === 'assistant' ? (
          <div
            key={i}
            style={{
              font: '500 13.5px/1.65 var(--font-cn)',
              color: 'var(--t-body)',
              whiteSpace: 'pre-wrap',
              background: 'var(--c-blue-wash2)',
              borderRadius: 'var(--r-sm)',
              padding: '12px 13px',
              borderLeft: '3px solid var(--c-blue)',
              textWrap: 'pretty' as never,
            }}
          >
            {m.animate ? <Typewriter text={m.content} onTick={scroll} /> : m.content}
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                font: '500 13px/1.5 var(--font-cn)',
                color: '#fff',
                maxWidth: '82%',
                background: 'var(--c-blue)',
                borderRadius: '14px 14px 4px 14px',
                padding: '9px 12px',
              }}
            >
              {m.content}
            </div>
          </div>
        ),
      )}

      {busy && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--t-2nd)',
            font: '500 13px/1 var(--font-cn)',
          }}
        >
          <span className="ai-dots">
            <i />
            <i />
            <i />
          </span>{' '}
          AI 思考中…
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--c-accent-wash)',
            borderRadius: 'var(--r-sm)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span style={{ font: '500 12.5px/1.4 var(--font-cn)', color: 'var(--c-accent-600)' }}>
            {error}
          </span>
          <button
            className="btn btn--accent"
            style={{ height: 32, padding: '0 14px', fontSize: 13 }}
            onClick={() => {
              const lastUser = [...chatMessages].reverse().find(c => c.role === 'user');
              const hasAssistant = chatMessages.some(c => c.role === 'assistant');
              ask(lastUser ? lastUser.content : '', !hasAssistant);
            }}
          >
            <Icon name="rotate-cw" size={14} /> 重试
          </button>
        </div>
      )}

      {!busy && chatMessages.some(c => c.role === 'assistant') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => ask(q, false)}
                style={{
                  cursor: 'pointer',
                  font: '500 12px/1.3 var(--font-cn)',
                  color: 'var(--c-blue-700)',
                  background: 'var(--c-blue-wash)',
                  border: '1px solid var(--c-blue-soft)',
                  borderRadius: 'var(--r-full)',
                  padding: '7px 12px',
                  textAlign: 'left',
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && input.trim()) {
                  ask(input.trim(), false);
                  setInput('');
                }
              }}
              placeholder="继续追问，比如：转专业难不难？"
              style={{
                flex: 1,
                height: 42,
                padding: '0 14px',
                borderRadius: 'var(--r-full)',
                border: '1px solid var(--border-2)',
                font: '500 13px/1 var(--font-cn)',
                color: 'var(--t-title)',
                outline: 'none',
                background: 'var(--g-2)',
              }}
            />
            <button
              className="iconbtn"
              style={{ width: 42, height: 42, background: 'var(--c-blue)', border: 'none', color: '#fff' }}
              disabled={!input.trim()}
              onClick={() => {
                ask(input.trim(), false);
                setInput('');
              }}
            >
              <Icon name="arrow-up" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
