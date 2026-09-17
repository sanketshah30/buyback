import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
}

export function Card({ children, interactive = false, selected = false, className, ...rest }: CardProps) {
  return (
    <div
      className={`card ${interactive ? 'card--interactive' : ''} ${selected ? 'card--selected' : ''} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </div>
  );
}
