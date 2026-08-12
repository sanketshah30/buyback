import type { ReactNode } from 'react';
import './Banner.css';

interface BannerProps {
  tone?: 'info' | 'error' | 'success' | 'warning';
  children: ReactNode;
}

export function Banner({ tone = 'info', children }: BannerProps) {
  return <div className={`banner banner--${tone}`}>{children}</div>;
}
