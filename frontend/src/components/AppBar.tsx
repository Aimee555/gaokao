import type { ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  onBack?: () => void;
  title: string;
  right?: ReactNode;
}

export default function AppBar({ onBack, title, right }: Props) {
  return (
    <div className="appbar">
      {onBack ? (
        <button className="iconbtn" onClick={onBack} aria-label="返回">
          <Icon name="arrow-left" size={18} />
        </button>
      ) : (
        <span style={{ width: 36 }} />
      )}
      <span className="title" style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </span>
      {right ?? <span style={{ width: 36 }} />}
    </div>
  );
}
