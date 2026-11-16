import { Button } from '../ui/Button';
import { Select, type SelectOption } from '../ui/Select';
import { TextField } from '../ui/TextField';
import { EMPTY_ENTRY } from '../../lib/adminFormat';
import type { EntryRow } from './FormFields';
import './DepreciationEntriesEditor.css';

interface DepreciationEntriesEditorProps {
  rows: EntryRow[];
  questionAnswerOptions: SelectOption[];
  onChange: (rows: EntryRow[]) => void;
  error?: string;
  disabled?: boolean;
}

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'absolute', label: 'Absolute amount' },
];

export function DepreciationEntriesEditor({ rows, questionAnswerOptions, onChange, error, disabled }: DepreciationEntriesEditorProps) {
  const update = (index: number, patch: EntryRow) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="dep-entries">
      <span className="dep-entries__title">Deductions *</span>
      {rows.map((row, index) => (
        <div key={index} className="dep-entries__row">
          <Select
            label="Question / answer"
            options={questionAnswerOptions}
            value={row.questionAnswerId}
            onChange={(value) => update(index, { questionAnswerId: value })}
            disabled={disabled}
          />
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            value={row.depreciationType}
            onChange={(value) => update(index, { depreciationType: value })}
            disabled={disabled}
          />
          <TextField
            label="Value"
            id={`dep-entry-value-${index}`}
            type="number"
            min={0}
            step="any"
            value={row.depreciationValue}
            onChange={(e) => update(index, { depreciationValue: e.target.value })}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="danger"
            fullWidth={false}
            disabled={disabled || rows.length === 1}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      {error && <span className="dep-entries__error">{error}</span>}
      <Button type="button" variant="secondary" fullWidth={false} disabled={disabled} onClick={() => onChange([...rows, { ...EMPTY_ENTRY }])}>
        + Add deduction
      </Button>
    </div>
  );
}
