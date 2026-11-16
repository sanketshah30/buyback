import type { ReactNode } from 'react';
import { Select, type SelectOption } from '../ui/Select';
import { TextField } from '../ui/TextField';
import './FormFields.css';

export type EntryRow = Record<string, string>;
export type FieldValue = string | string[] | EntryRow[];
export type FormValues = Record<string, FieldValue>;

export interface FieldDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'multiselect' | 'custom';
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  maxLength?: number;
  step?: string;
  hint?: string;
  /** Which drawer modes show this field. Default: both. */
  mode?: 'create' | 'edit';
  /** Shown but not editable when editing an existing record (e.g. immutable parent ids). */
  readOnlyOnEdit?: boolean;
  /** Required for kind 'custom'. */
  render?: (value: FieldValue, onChange: (value: FieldValue) => void, error?: string) => ReactNode;
}

interface FormFieldsProps {
  fields: FieldDef[];
  values: FormValues;
  errors: Record<string, string>;
  editing: boolean;
  disabled?: boolean;
  onChange: (key: string, value: FieldValue) => void;
}

export function FormFields({ fields, values, errors, editing, disabled = false, onChange }: FormFieldsProps) {
  return (
    <>
      {fields
        .filter((f) => !f.mode || (f.mode === 'edit') === editing)
        .map((field) => {
          const value = values[field.key];
          const error = errors[field.key];
          const locked = disabled || (editing && field.readOnlyOnEdit === true);
          const label = field.required ? `${field.label} *` : field.label;
          const set = (next: FieldValue) => onChange(field.key, next);

          switch (field.kind) {
            case 'select':
              return (
                <Select
                  key={field.key}
                  label={label}
                  options={field.options ?? []}
                  value={typeof value === 'string' ? value : ''}
                  onChange={set}
                  placeholder={field.placeholder}
                  disabled={locked}
                  error={error}
                />
              );
            case 'multiselect': {
              const selected = Array.isArray(value) ? (value as string[]) : [];
              return (
                <div key={field.key} className="form-fields__group">
                  <span className="form-fields__label">{label}</span>
                  <div className="form-fields__checks">
                    {(field.options ?? []).length === 0 && <p>No options available.</p>}
                    {(field.options ?? []).map((option) => (
                      <label key={option.value} className="form-fields__check">
                        <input
                          type="checkbox"
                          checked={selected.includes(option.value)}
                          disabled={locked}
                          onChange={(e) =>
                            set(e.target.checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {error && <span className="form-fields__error">{error}</span>}
                </div>
              );
            }
            case 'custom':
              return (
                <div key={field.key} className="form-fields__group">
                  {field.render?.(value ?? '', set, error)}
                </div>
              );
            default:
              return (
                <div key={field.key} className="form-fields__group">
                  <TextField
                    label={label}
                    id={`field-${field.key}`}
                    type={field.kind}
                    inputMode={field.kind === 'number' ? 'decimal' : undefined}
                    step={field.step}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => set(e.target.value)}
                    disabled={locked}
                    error={error}
                  />
                  {field.hint && <span className="form-fields__hint">{field.hint}</span>}
                </div>
              );
          }
        })}
    </>
  );
}
