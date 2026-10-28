import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Clock3, Gauge, ShieldCheck, X, CheckCircle2, Circle, Wrench } from 'lucide-react';
import { formatWhen } from '../../features/jobs/bookingProgress';

export type WorkItem = {
  id: string; quoteId?: string; quoteNumber?: number;
  description: string; category?: string; quantity?: number; completed: boolean;
};
export type WorkReport = { items: WorkItem[]; notes: string; mileage: number; updatedAt: string };

export function quotationWorkItems(job: any): WorkItem[] {
  const primary = job?.quoteApproved ? [{ quoteNumber: 1, quoteId: job.serverQuoteId || 'primary', items: job.items }] : [];
  const additional = (job?.additionalQuotes || []).filter((q: any) => q.quoteApproved);
  return [...primary, ...additional].flatMap((quote: any) =>
    (quote.items || []).filter((item: any) => item.approved !== false && item.id).map((item: any) => ({
      id: item.id, quoteId: quote.quoteId, quoteNumber: quote.quoteNumber || 1,
      description: item.name || item.description || 'Approved repair',
      category: item.category || '', quantity: item.quantity || 1, completed: false,
    })));
}

/** Work log popup is shared by the mechanic's editor and all read-only views. */
function ReportDialog({ title, subtitle, children, onClose }: {
  title: string; subtitle: string; children: React.ReactNode; onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(panel.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]'
      ) || [])].filter((item) => item.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    closeButton.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, []);
  return (
    <div className="var-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panel} className="var-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="var-modal-head">
          <div><span className="var-eyebrow"><Wrench size={16}/> Verifi Auto · Vehicle service record</span>
            <h2>{title}</h2><p>{subtitle}</p>
          </div>
          <button ref={closeButton} className="var-close" type="button" aria-label="Close popup" onClick={onClose}><X size={21}/></button>
        </header>
        <div className="var-modal-body">{children}</div>
      </section>
    </div>
  );
}
export function WorkReportEditor({ job, onSave, onClose }: {
  job: any; onSave: (values: { checkedLineIds: string[]; notes: string; mileage: number }) => Promise<void> | void; onClose: () => void;
}) {
  const items = useMemo(() => quotationWorkItems(job), [job]);
  const report = job.workReport as WorkReport | null;
  const [checked, setChecked] = useState<string[]>(() => (report?.items || []).filter((item) => item.completed).map((item) => item.id));
  const [notes, setNotes] = useState(report?.notes || '');
  const [mileage, setMileage] = useState(report?.mileage != null ? String(report.mileage) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const done = checked.length;
  return (
    <ReportDialog title={report ? 'Edit work report' : 'Add completed work'} subtitle="Mark the approved quotation items you have actually completed. You can edit this report while the job is in progress." onClose={onClose}>
      <form className="var-work-form" onSubmit={async (event) => {
        event.preventDefault();
        const n = Number(mileage);
        if (!mileage.trim() || !Number.isInteger(n) || n < 0 || n > 5_000_000) { setError('Enter a valid odometer reading between 0 and 5,000,000 km.'); return; }
        if (notes.trim().length < 5) { setError('Describe the work performed (at least 5 characters).'); return; }
        if (busy) return;
        setBusy(true); setError('');
        try { await onSave({ checkedLineIds: checked, notes: notes.trim(), mileage: n }); onClose(); }
        catch (reason: any) { setError(reason?.message || 'Could not save the work report.'); }
        finally { setBusy(false); }
      }}>
        <div className="var-progress-summary">
          <span><ClipboardCheck size={18}/> Quotation checklist</span>
          <strong>{done} of {items.length} marked complete</strong>
        </div>
        <div className="var-check-list">
          {items.length ? items.map((item) => (
            <label className={'var-check-item' + (checked.includes(item.id) ? ' is-done' : '')} key={item.id}>
              <input type="checkbox" checked={checked.includes(item.id)}
                onChange={(event) => setChecked((current) => event.target.checked ? [...current, item.id] : current.filter((v) => v !== item.id))} />
              <span><b>{item.description}</b><small>Quotation {item.quoteNumber}{item.quantity ? ' · Qty ' + item.quantity : ''}</small></span>
            </label>
          )) : <p className="muted">No approved quotation items are available. Approve the quotation before recording work.</p>}
        </div>
        <label className="var-form-label">Work performed / additional technician notes
          <textarea required minLength={5} maxLength={4000} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)}
            placeholder="Describe inspections, parts fitted, checks performed, and any remaining work…" />
        </label>
        <label className="var-form-label">Vehicle odometer at service (km)
          <input required type="number" min={0} max={5000000} step={1} value={mileage} onChange={(event) => setMileage(event.target.value)} placeholder="e.g. 68400" />
        </label>
        <p className="var-fine-print">Saving updates this booking's work report and the vehicle's in-progress history. It does not mark the job finished or claim that unchecked tasks are complete.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="var-modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={busy || !items.length}>{busy ? 'Saving…' : report ? 'Save changes' : 'Save work report'}</button></div>
      </form>
    </ReportDialog>
  );
}

export function WorkReportViewer({ report, onClose, workshop, final = false }: {
  report: WorkReport; onClose: () => void; workshop?: string; final?: boolean;
}) {
  const items = Array.isArray(report.items) ? report.items : [];
  return (
    <ReportDialog title="Vehicle work report" subtitle={workshop ? 'Recorded by ' + workshop : 'Service details for this booking'} onClose={onClose}>
      <div className="var-summary-strip">
        <span><ShieldCheck size={17}/>{final ? 'Completed service record' : 'Work report · In progress'}</span>
        <span><Gauge size={17}/>{report.mileage == null ? 'Mileage not recorded' : Number(report.mileage).toLocaleString('en-ZA') + ' km'}</span>
        <span><Clock3 size={17}/>{report.updatedAt ? formatWhen(report.updatedAt) : 'Date not recorded'}</span>
      </div>
      <h3 className="var-section-heading">Quoted work checklist</h3>
      <div className="var-read-list">
        {items.length ? items.map((item, index) => (
          <div key={item.id || index} className="var-read-item">
            {item.completed ? <CheckCircle2 size={20} className="var-check-success" /> : <Circle size={20} className="var-check-pending" />}
            <span><b>{item.description}</b><small>Quotation {item.quoteNumber || 1} · {item.completed ? 'Marked done' : 'Not marked done'}</small></span>
          </div>
        )) : <p>No individual repair items recorded.</p>}
      </div>
      <h3 className="var-section-heading">Technician's notes</h3>
      <p className="var-report-notes">{report.notes || 'No notes supplied.'}</p>
      {!final && <p className="var-fine-print">The mechanic can still revise this report while the booking is in progress. This is not yet a final completed service record.</p>}
      <div className="var-modal-actions"><button type="button" className="primary" onClick={onClose}>Close report</button></div>
    </ReportDialog>
  );
}

export function VarHistoryViewer({ records, onClose }: { records: any[]; onClose: () => void }) {
  return (
    <ReportDialog title="Vehicle Activity Record (VAR)" subtitle="Only the service records explicitly shared by the customer for this booking appear here." onClose={onClose}>
      <div className="var-read-list">
        {records.length ? records.map((record: any) => {
          const parts = Array.isArray(record.repairs) ? record.repairs : [];
          const items = parts.flatMap((part: any) => Array.isArray(part.lines)
            ? part.lines.map((line: any) => ({ ...line, completed: true })) : [part]);
          return (
            <details className="var-history-entry" key={record.id}>
              <summary>
                <span><b>{record.booking?.professional?.name || record.provider || 'Professional not recorded'}</b>
                  <small>{record.createdAt ? formatWhen(record.createdAt) : record.date || 'Date not recorded'} · {record.mileage == null ? 'Mileage unknown' : Number(record.mileage).toLocaleString('en-ZA') + ' km'}</small></span>
                <span>View service</span>
              </summary>
              <p className="var-report-notes">{record.notes || 'No notes supplied.'}</p>
              {items.map((item: any, index: number) => <div key={item.id || index} className="var-read-item">
                {item.completed !== false ? <CheckCircle2 size={18} className="var-check-success"/> : <Circle size={18}/>}
                <span>{item.description || item.name || 'Serviced item'}</span>
              </div>)}
            </details>
          );
        }) : <p className="muted">No shared vehicle service history is available.</p>}
      </div>
      <div className="var-modal-actions"><button type="button" className="primary" onClick={onClose}>Close VAR</button></div>
    </ReportDialog>
  );
}
