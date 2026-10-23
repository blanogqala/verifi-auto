import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type Props = {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (values: string[]) => void;
  maxItems?: number;
};

/** Choose multiple presets, or create and remove custom area/service labels. */
export function TagPicker({ label, values, suggestions, onChange, maxItems = 25 }: Props) {
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState('');
  const items = Array.isArray(values) ? values : [];
  const available = [...new Set(suggestions)].filter(
    (suggestion) => !items.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  );
  function add(raw: string) {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value || value.length > 100 || items.length >= maxItems) return;
    if (items.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...items, value]);
    setCustom('');
    setSelected('');
  }
  return (
    <div className="tag-picker">
      <div className="tag-picker-controls">
        <select aria-label={`Choose suggested ${label.toLowerCase()}`}
          value={selected} disabled={items.length >= maxItems}
          onChange={(event) => { setSelected(event.target.value); add(event.target.value); }}>
          <option value="">Choose a suggested {label.toLowerCase()}</option>
          {available.map((option) => <option value={option} key={option}>{option}</option>)}
        </select>
        <input aria-label={`Add custom ${label.toLowerCase()}`}
          placeholder={`Or enter another ${label.toLowerCase()}`}
          value={custom} maxLength={100} disabled={items.length >= maxItems}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); add(custom); }
          }} />
        <button type="button" className="secondary" onClick={() => add(custom)}
          disabled={!custom.trim() || items.length >= maxItems}>
          <Plus size={15} /> Add
        </button>
      </div>
      <div className="tag-picker-tags" aria-live="polite">
        {items.map((item) => (
          <span className="tag-picker-tag" key={item.toLowerCase()}>
            {item}
            <button type="button" title={`Remove ${item}`}
              aria-label={`Remove ${item}`}
              onClick={() => onChange(items.filter((value) => value !== item))}>
              <X size={14} />
            </button>
          </span>
        ))}
        {!items.length && <small className="muted">No {label.toLowerCase()} selected.</small>}
      </div>
      <small className="muted">{items.length} of {maxItems} selected. Choose several suggestions or add your own.</small>
    </div>
  );
}
