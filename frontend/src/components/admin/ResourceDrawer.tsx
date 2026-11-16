import { useEffect, type FormEvent, type ReactNode } from 'react';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import './ResourceDrawer.css';

interface ResourceDrawerProps {
  open: boolean;
  title: string;
  submitLabel: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}

export function ResourceDrawer({ open, title, submitLabel, submitting = false, error, onClose, onSubmit, children }: ResourceDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="resource-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="resource-drawer__backdrop" onClick={() => !submitting && onClose()} />
      <form className="resource-drawer__panel" onSubmit={handleSubmit} noValidate>
        <header className="resource-drawer__header">
          <h2>{title}</h2>
          <button type="button" className="resource-drawer__close" onClick={onClose} disabled={submitting} aria-label="Close">
            ×
          </button>
        </header>
        <div className="resource-drawer__body">
          {error && <Banner tone="error">{error}</Banner>}
          {children}
        </div>
        <footer className="resource-drawer__footer">
          <Button type="button" variant="secondary" fullWidth={false} onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" fullWidth={false} loading={submitting}>
            {submitLabel}
          </Button>
        </footer>
      </form>
    </div>
  );
}
