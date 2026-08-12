import './OptionList.css';

export interface SelectableOption {
  id: string;
  label: string;
  helper?: string;
}

interface OptionListProps {
  options: SelectableOption[];
  multi?: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** In multi-choice mode, an option id (e.g. "none") that is mutually exclusive with every other option. */
  exclusiveOptionId?: string;
}

export function OptionList({ options, multi = false, selectedIds, onChange, exclusiveOptionId }: OptionListProps) {
  const toggle = (id: string) => {
    if (multi) {
      if (exclusiveOptionId && id === exclusiveOptionId) {
        onChange(selectedIds.includes(id) ? [] : [id]);
        return;
      }
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((s) => s !== id));
      } else {
        const withoutExclusive = exclusiveOptionId ? selectedIds.filter((s) => s !== exclusiveOptionId) : selectedIds;
        onChange([...withoutExclusive, id]);
      }
    } else {
      onChange([id]);
    }
  };

  return (
    <div className="option-list" role={multi ? 'group' : 'radiogroup'}>
      {options.map((option) => {
        const active = selectedIds.includes(option.id);
        return (
          <button
            type="button"
            key={option.id}
            className={`option-item ${active ? 'option-item--active' : ''}`}
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => toggle(option.id)}
          >
            <span className={`option-item__control option-item__control--${multi ? 'checkbox' : 'radio'}`}>
              {active && <span className="option-item__dot" />}
            </span>
            <span className="option-item__text">
              <span className="option-item__label">{option.label}</span>
              {option.helper && <span className="option-item__helper">{option.helper}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
