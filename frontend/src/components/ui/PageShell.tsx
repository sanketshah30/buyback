import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './PageShell.css';

interface PageShellProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function PageShell({ title, subtitle, onBack, showBack = true, children, footer }: PageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      {(title || showBack) && (
        <header className="page-shell__header">
          {showBack && (
            <button
              type="button"
              className="page-shell__back"
              aria-label="Go back"
              onClick={() => (onBack ? onBack() : navigate(-1))}
            >
              ‹
            </button>
          )}
          <div className="page-shell__titles">
            {title && <h1 className="page-shell__title">{title}</h1>}
            {subtitle && <p className="page-shell__subtitle">{subtitle}</p>}
          </div>
        </header>
      )}
      <main className="page-shell__content">{children}</main>
      {footer && <footer className="page-shell__footer">{footer}</footer>}
    </div>
  );
}
