import { useId, useState } from 'react';
import { paintColours, resolvePaintColour } from '../../features/garage/paintColours';

export function PaintColourField({ color = '', name = '' }: { color?: string; name?: string }) {
  const id = useId();
  const [text, setText] = useState(name || color);
  const [hex, setHex] = useState(resolvePaintColour(color) || resolvePaintColour(name));
  return (
    <div className="paint-field">
      <label htmlFor={id}>Paint colour <span className="muted">(optional)</span></label>
      <div className="paint-field-controls">
        <input id={id} name="paintColorName" list={id + '-colours'} value={text}
          maxLength={80} placeholder="Silver, blue, or #2455a4"
          onChange={event => { setText(event.target.value); setHex(resolvePaintColour(event.target.value)); }} />
        <input className="paint-colour-picker" type="color" aria-label="Choose paint colour"
          value={hex || '#f2f2f2'} onChange={event => { setHex(event.target.value); setText(event.target.value); }} />
      </div>
      <datalist id={id + '-colours'}>{Object.keys(paintColours).filter(n => n !== 'gray').map(n => <option key={n} value={n} />)}</datalist>
      <input type="hidden" name="paintColor" value={hex} />
      <div className="paint-colour-preview" style={{ borderColor: hex || 'var(--line)' }}>
        <i style={{ background: hex || 'transparent' }} aria-hidden="true" />
        <span>{text.trim() ? (hex ? text : `${text} — name saved; choose a swatch for the preview`) : 'No colour selected'}</span>
      </div>
      <small className="muted">Preview colours are approximate, not manufacturer paint codes.</small>
    </div>
  );
}
