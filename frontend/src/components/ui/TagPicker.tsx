import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';

type Props = {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (values: string[]) => void;
  maxItems?: number;
};

export function TagPicker({ label, values, suggestions, onChange, maxItems = 25 }: Props) {
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const selected = Array.isArray(values) ? values : [];
  const full = selected.length >= maxItems;
  const available = [...new Set(suggestions.map((s) => s.trim()).filter(Boolean))].filter(
    (item) => !selected.some((value) => value.toLowerCase() === item.toLowerCase()),
  );
  const matching = available.filter(
    (value) => value.toLowerCase().includes(query.trim().toLowerCase()),
  ).slice(0, 12);
  const text = query.trim().replace(/\s+/g, ' ');
  const canCreate = !!text && text.length >= 2 && text.length <= 100 && !full
    && !selected.some((value) => value.toLowerCase() === text.toLowerCase())
    && !matching.some((value) => value.toLowerCase() === text.toLowerCase());
  const options = matching.map((value) => ({ value, custom: false }));
  if (canCreate) options.push({ value: text, custom: true });

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  function add(raw: string) {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (full || value.length < 2 || value.length > 100 ||
        selected.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...selected, value]);
    setQuery('');
    setActive(-1);
    setOpen(false);
    field.current?.focus();
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (!options.length) return;
      setActive((index) => event.key === 'ArrowDown'
        ? (index + 1) % options.length
        : (index - 1 + options.length) % options.length);
    } else if (event.key === 'Enter') {
      if (!text && (!open || active < 0)) return;
      event.preventDefault(); // Never submit the business form accidentally.
      const option = open && active >= 0 ? options[active] : undefined;
      add(option?.value || matching.find((item) => item.toLowerCase() === text.toLowerCase()) || text);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'Tab') {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="tag-picker" ref={wrapper}>
      <label htmlFor={id + '-input'} className="tag-picker-label">{label}</label>
      <div className={'tag-picker-shell' + (open ? ' is-open' : '')}>
        <input
          ref={field}
          id={id + '-input'}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={open && !full}
          aria-controls={id + '-options'}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? id + '-option-' + active : undefined}
          aria-describedby={id + '-help'}
          autoComplete="off"
          value={query}
          maxLength={100}
          disabled={full}
          placeholder={'Search or add ' + label.toLowerCase()}
          onFocus={() => { setOpen(true); setActive(-1); }}
          onClick={() => { setOpen(true); setActive(-1); }}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
          onKeyDown={handleKeys}
        />
        <button
          type="button"
          className="tag-picker-toggle"
          aria-label={'Show ' + label.toLowerCase() + ' suggestions'}
          aria-expanded={open && !full}
          disabled={full}
          onClick={() => {
            field.current?.focus();
            setOpen((current) => !current);
            setActive(-1);
          }}
        >
          <ChevronDown size={18} />
        </button>
        {open && !full && (
          <div className="tag-picker-menu" id={id + '-options'} role="listbox"
            aria-label={label + ' suggestions'}>
            {options.length ? options.map((option, index) => (
              <button
                type="button"
                role="option"
                id={id + '-option-' + index}
                aria-selected={index === active}
                className={'tag-picker-option' + (index === active ? ' is-active' : '')}
                key={option.value.toLowerCase()}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => add(option.value)}
              >
                {option.custom ? <Plus size={16} /> : <Check size={16} />}
                <span>{option.custom ? 'Add "' + option.value + '"' : option.value}</span>
              </button>
            )) : (
              <p className="tag-picker-empty">No matching suggestions. Type your own service or area and press Enter.</p>
            )}
          </div>
        )}
      </div>
      <div className="tag-picker-tags" aria-live="polite">
        {selected.map((item) => (
          <span className="tag-picker-tag" key={item.toLowerCase()}>
            <span>{item}</span>
            <button type="button" aria-label={'Remove ' + item}
              title={'Remove ' + item}
              onClick={() => onChange(selected.filter((v) => v !== item))}>
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <small className="tag-picker-help" id={id + '-help'}>
        {selected.length} of {maxItems} selected · Choose a suggestion or type a new one and press Enter.
      </small>
    </div>
  );
}
