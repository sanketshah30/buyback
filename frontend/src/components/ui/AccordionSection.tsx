import type { ReactNode } from 'react';
import './AccordionSection.css';

interface AccordionSectionProps {
  index: number;
  title: string;
  status: 'pending' | 'active' | 'done';
  summary?: ReactNode;
  children?: ReactNode;
}

export function AccordionSection({ index, title, status, summary, children }: AccordionSectionProps) {
  return (
    <div className={`accordion-section accordion-section--${status}`}>
      <div className="accordion-section__header">
        <span className="accordion-section__index">{status === 'done' ? <CheckIcon /> : index}</span>
        <div className="accordion-section__heading">
          <h3 className="accordion-section__title">{title}</h3>
          {status === 'done' && summary && <p className="accordion-section__summary">{summary}</p>}
        </div>
      </div>
      {status === 'active' && <div className="accordion-section__body">{children}</div>}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
