import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { applyJobTransition, saveQuoteDraft } from '../../features/demo/demoActions';
import {
  blankQuoteRow,
  formatZar,
  quoteCategories,
  quoteTotalCents,
  rowsFromJob,
  rowsToLines,
  type QuoteRow,
} from '../../features/jobs/quotations';

const categoryOptions = [
  { id: '', label: 'Type' },
  { id: 'assessment', label: 'Assessment / diagnostics' },
  { id: 'labour', label: 'Labour' },
  { id: 'parts', label: 'Parts' },
  { id: 'other', label: 'Other' },
];

export function QuoteEditor({ job, actor, update, notify, onSent, onSave }: any) {
  const starting = rowsFromJob(job);
  const [rows, setRows] = useState<QuoteRow[]>(starting.rows);
  const [notes, setNotes] = useState(starting.notes);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'draft' | 'send' | ''>('');
  const submitId = useRef('');
  const stamp = `${job?.id || ''}:${job?.quoteVersion || 0}:${job?.quoteDraft?.updatedAt || ''}:${job?.status || ''}`;

  useEffect(() => {
    const next = rowsFromJob(job);
    setRows(next.rows);
    setNotes(next.notes);
    setError('');
    submitId.current = '';
  }, [stamp]);

  function patch(index: number, field: keyof QuoteRow, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  }

  function total() {
    try {
      return formatZar(quoteTotalCents(rowsToLines(rows)));
    } catch {
      return 'Enter prices to total';
    }
  }

  async function save(kind: 'draft' | 'send') {
    if (busy) return false;
    setBusy(kind);
    setError('');
    if (kind === 'send' && !submitId.current) submitId.current = crypto.randomUUID();
    const clientSubmitId = submitId.current;
    if (onSave) {
      try {
        const lines = rowsToLines(rows);
        if (notes.trim().length < 3)
          throw new Error('Add a short description of the proposed work.');
        await onSave({ lines, notes, send: kind === 'send', clientSubmitId });
      } catch (reason: any) {
        setError(reason.message || 'Could not save quotation.');
      } finally {
        setBusy('');
      }
      return;
    }

    const saved = commitUpdate(
      update,
      (data: any) => {
        if (kind === 'draft')
          return saveQuoteDraft(
            data,
            { bookingId: job.bookingId || job.id, quoteId: job.quoteId, rows, notes },
            actor,
          );
        const result = applyJobTransition(
          data,
          job,
          'quote',
          { rows, notes, clientSubmitId },
          actor,
        );
        if (result.duplicate) return data;
        return result.data;
      },
      notify,
      kind === 'draft' ? 'Quotation draft saved.' : '',
    );
    setBusy('');
    if (!saved) {
      setError('Could not save this quotation. Your draft is still in the editor.');
      return false;
    }
    if (kind === 'send') {
      submitId.current = '';
      notify('Quotation sent for approval.');
      onSent?.();
    }
    return true;
  }

  return (
    <form
      className="quote-editor"
      onSubmit={(event) => {
        event.preventDefault();
        save('send');
      }}
    >
      <p className="muted">
        Include assessment or diagnostics, parts, labour, and any other charge. This draft stays
        private until you send it for approval.
      </p>
      {rows.map((row, index) => (
        <div className="quote-editor-line" key={row.id}>
          <label>
            Type
            <select
              aria-label={`Line ${index + 1} type`}
              value={quoteCategories.includes(row.category as any) ? row.category : ''}
              onChange={(event) => patch(index, 'category', event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option.id || 'none'} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="quote-editor-description">
            Description
            <input
              value={row.name}
              onChange={(event) => patch(index, 'name', event.target.value)}
            />
          </label>
          <label>
            Qty
            <input
              inputMode="numeric"
              aria-label={`Line ${index + 1} quantity`}
              value={row.quantity}
              placeholder="Optional"
              onChange={(event) => patch(index, 'quantity', event.target.value)}
            />
          </label>
          <label>
            Price (R)
            <input
              inputMode="decimal"
              aria-label={`Line ${index + 1} price`}
              value={row.price}
              onChange={(event) => patch(index, 'price', event.target.value)}
            />
          </label>
          <button
            type="button"
            aria-label={`Remove line ${index + 1}`}
            disabled={rows.length === 1}
            onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        className="text-link"
        type="button"
        onClick={() => setRows((current) => [...current, blankQuoteRow()])}
      >
        <Plus size={16} /> Add a line
      </button>
      <label>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <p className="quote-editor-total">
        Total <b>{total()}</b>
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="button-row">
        <button className="secondary" type="button" disabled={!!busy} onClick={() => save('draft')}>
          {busy === 'draft' ? 'Saving…' : 'Save draft'}
        </button>
        <button className="primary" type="submit" disabled={!!busy}>
          {busy === 'send' ? 'Sending…' : 'Send quotation'}
        </button>
      </div>
    </form>
  );
}
