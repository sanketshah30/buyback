import type { ReactNode } from 'react';
import './AccordionSection.css';

interface AccordionSectionProps {
  index: number;
  title: string;
  status: 'pending' | 'active' | 'done';
  summary?: ReactNode;
  children?: ReactNode;
  onEdit?: () => void;
}

export function AccordionSection({ index, title, status, summary, children, onEdit }: AccordionSectionProps) {
  const editable = status === 'done' && Boolean(onEdit);

  return (
    <div className={`accordion-section accordion-section--${status}`}>
      <div
        className={`accordion-section__header ${editable ? 'accordion-section__header--editable' : ''}`}
        onClick={editable ? onEdit : undefined}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onKeyDown={
          editable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') onEdit?.();
              }
            : undefined
        }
      >
        <span className="accordion-section__index">{status === 'done' ? <CheckIcon /> : index}</span>
        <div className="accordion-section__heading">
          <h3 className="accordion-section__title">{title}</h3>
          {status === 'done' && summary && <p className="accordion-section__summary">{summary}</p>}
        </div>
        {editable && (
          <span className="accordion-section__edit">
            <EditIcon />
          </span>
        )}
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

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 15.5V20z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
