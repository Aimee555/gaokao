import type { CSSProperties } from 'react';
import * as LucideIcons from 'lucide-react';

function toPascal(name: string): string {
  return name
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 2,
  className,
  style,
}: Props) {
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
    style?: CSSProperties;
  }>>)[toPascal(name)];
  if (!Comp) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', ...style }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <Comp
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={{ display: 'block', flex: 'none', ...style }}
    />
  );
}
