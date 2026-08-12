import type { InputHTMLAttributes } from 'react';
import './TextField.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightSlot?: React.ReactNode;
}

export function TextField({ label, error, rightSlot, id, ...rest }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="text-field" htmlFor={inputId}>
      <span className="text-field__label">{label}</span>
      <div className="text-field__control">
        <input id={inputId} className="text-field__input" {...rest} />
        {rightSlot}
      </div>
      {error && <span className="text-field__error">{error}</span>}
    </label>
  );
}
