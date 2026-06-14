import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  speed?: number;
  onTick?: () => void;
  onDone?: () => void;
}

export default function Typewriter({ text, speed = 16, onTick, onDone }: Props) {
  const [n, setN] = useState(0);
  const onTickRef = useRef(onTick);
  const onDoneRef = useRef(onDone);
  onTickRef.current = onTick;
  onDoneRef.current = onDone;

  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(i);
      onTickRef.current?.();
      if (i >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  const done = n >= text.length;
  return (
    <span>
      {text.slice(0, n)}
      {!done && (
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 15,
            background: 'var(--c-blue)',
            marginLeft: 1,
            borderRadius: 1,
            verticalAlign: '-2px',
            animation: 'blink 1s steps(1) infinite',
          }}
        />
      )}
    </span>
  );
}
