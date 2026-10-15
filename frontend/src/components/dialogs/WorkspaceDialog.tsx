import { ArrowRight, Check, X, FileText, CheckCircle2, Wallet, Plus, Trash2 } from 'lucide-react';
import { quoteTotal } from '../../demo';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceDialog({
  checks,
  data,
  dialog,
  editItems,
  filter,
  jobAction,
  name,
  note,
  notify,
  profile,
  quoteEditor,
  quoteNotes,
  review,
  reviewNote,
  role,
  setChecks,
  setDialog,
  setEditItems,
  setQuoteNotes,
  setReviewNote,
  update,
}: any) {
  return (
    <div className="modal-backdrop" onClick={() => setDialog(null)}>
      <section
        className="modal workspace-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Workspace action"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" aria-label="Close dialog" onClick={() => setDialog(null)}>
          <X />
        </button>
        {dialog.kind === 'vehicle' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const v = {
                id: dialog.vehicle?.id || crypto.randomUUID(),
                make: String(f.get('make')).trim(),
                model: String(f.get('model')).trim(),
                year: f.get('year'),
                registration: f.get('registration'),
                mileage: f.get('mileage'),
              };
              update((d: any) => ({
                ...d,
                vehicles: dialog.vehicle
                  ? d.vehicles.map((x: any) => (x.id === v.id ? v : x))
                  : [...d.vehicles, v],
              }));
              setDialog(null);
              notify('Sample vehicle saved.');
            }}
          >
            <span className="chip">MY GARAGE</span>
            <h2>{dialog.vehicle ? 'Edit vehicle' : 'Add your vehicle'}</h2>
            <div className="form-row">
              <label>
                Make
                <input name="make" required defaultValue={dialog.vehicle?.make} />
              </label>
              <label>
                Model
                <input name="model" required defaultValue={dialog.vehicle?.model} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Year
                <input
                  name="year"
                  type="number"
                  min="1900"
                  max="2027"
                  required
                  defaultValue={dialog.vehicle?.year || 2020}
                />
              </label>
              <label>
                Mileage (km)
                <input
                  name="mileage"
                  type="number"
                  min="0"
                  max="9999999"
                  required
                  defaultValue={dialog.vehicle?.mileage || 0}
                />
              </label>
            </div>
            <label>
              Sample registration
              <input
                name="registration"
                required
                defaultValue={dialog.vehicle?.registration || 'DEMO 002'}
              />
            </label>
            <button className="primary full">
              Save vehicle <Check size={17} />
            </button>
          </form>
        )}
        {dialog.kind === 'job' && (
          <>
            <span className="reference">{dialog.job.id}</span>
            <h2>{dialog.job.vehicle}</h2>
            <Status value={dialog.job.status} />
            <p>
              {dialog.job.provider}
              <br />
              {dialog.job.date} at {dialog.job.time}
            </p>
            <div className="notice">
              Assessment fee: R{dialog.job.fee}. Repair costs are quoted separately and require
              customer approval.
            </div>
            {dialog.job.items?.length > 0 && (
              <>
                <h3>Repair quote</h3>
                {dialog.job.items.map((i: any, k: number) => (
                  <div className="invoice-line" key={k}>
                    <span>{i.name}</span>
                    <b>R{Number(i.amount).toLocaleString()}</b>
                  </div>
                ))}
                <div className="invoice-line total">
                  <span>Total</span>
                  <b>R{quoteTotal(dialog.job).toLocaleString()}</b>
                </div>
              </>
            )}
            {dialog.job.notes && <p>{dialog.job.notes}</p>}
            {dialog.job.changeRequest && (
              <div className="notice">Customer requested: {dialog.job.changeRequest}</div>
            )}
            {dialog.job.completionNotes && (
              <div className="notice">Work performed: {dialog.job.completionNotes}</div>
            )}
            <div className="button-row">
              {role === 'mechanic' && (
                <>
                  {dialog.job.status === 'Requested' && (
                    <button className="primary" onClick={() => jobAction(dialog.job, 'confirm')}>
                      Confirm demo appointment
                    </button>
                  )}
                  {['Confirmed', 'Changes requested', 'Awaiting approval'].includes(
                    dialog.job.status,
                  ) && (
                    <button className="primary" onClick={() => quoteEditor(dialog.job)}>
                      Prepare repair quote
                    </button>
                  )}
                  {dialog.job.status === 'Approved' && (
                    <button className="primary" onClick={() => jobAction(dialog.job, 'start')}>
                      Start approved work
                    </button>
                  )}
                  {dialog.job.status === 'In progress' && (
                    <button
                      className="primary"
                      onClick={() => setDialog({ ...dialog, kind: 'complete' })}
                    >
                      Record completed work
                    </button>
                  )}
                </>
              )}
              {role === 'customer' && (
                <>
                  {dialog.job.status === 'Awaiting approval' && (
                    <button
                      className="primary"
                      onClick={() => setDialog({ ...dialog, kind: 'approve' })}
                    >
                      Review & approve quote
                    </button>
                  )}
                  {dialog.job.status === 'Awaiting payment' && (
                    <button
                      className="primary"
                      onClick={() => setDialog({ ...dialog, kind: 'pay' })}
                    >
                      Review invoice
                    </button>
                  )}
                  {['Requested', 'Confirmed'].includes(dialog.job.status) && (
                    <button
                      className="secondary"
                      onClick={() => setDialog({ ...dialog, kind: 'cancel' })}
                    >
                      Cancel request
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
        {dialog.kind === 'approve' && (
          <>
            <span className="chip">YOUR APPROVAL COMES FIRST</span>
            <h2>Review the repair quote.</h2>
            <p>
              {dialog.job.vehicle} · {dialog.job.provider}
            </p>
            {dialog.job.items.map((i: any, k: number) => (
              <div className="invoice-line" key={k}>
                <span>{i.name}</span>
                <b>R{i.amount}</b>
              </div>
            ))}
            <div className="invoice-line total">
              <span>Repair total</span>
              <b>R{quoteTotal(dialog.job)}</b>
            </div>
            <p>{dialog.job.notes}</p>
            <div className="notice">
              Approving authorises the proposed repair work in this demo. It does not take a
              payment. Assessment fee of R{dialog.job.fee} is separate.
            </div>
            <button className="primary full" onClick={() => jobAction(dialog.job, 'approve')}>
              Approve demo quote <Check size={18} />
            </button>
          </>
        )}
        {dialog.kind === 'changes' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = String(new FormData(e.currentTarget).get('request'));
              jobAction(dialog.job, 'changes', { changeRequest: text });
            }}
          >
            <h2>Ask for a clearer quote.</h2>
            <label>
              What needs changing?
              <textarea
                required
                name="request"
                placeholder="Explain which item or cost you want clarified."
              />
            </label>
            <button className="primary full">Send demo change request</button>
          </form>
        )}
        {dialog.kind === 'quote-edit' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              jobAction(dialog.job, 'quote', {
                items: editItems.map((i) => ({ ...i, amount: Number(i.amount) })),
                notes: quoteNotes,
              });
            }}
          >
            <span className="chip">{dialog.job.id}</span>
            <h2>Prepare a clear quote.</h2>
            <p>Itemise parts and labour. The customer must approve before work begins.</p>
            {editItems.map((item, i) => (
              <div className="quote-editor-row" key={i}>
                <label>
                  Item description
                  <input
                    required
                    value={item.name}
                    onChange={(e) =>
                      setEditItems(
                        editItems.map((v, k) => (i === k ? { ...v, name: e.target.value } : v)),
                      )
                    }
                  />
                </label>
                <label>
                  Amount (R)
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) =>
                      setEditItems(
                        editItems.map((v, k) => (i === k ? { ...v, amount: e.target.value } : v)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={'Remove line ' + (i + 1)}
                  disabled={editItems.length === 1}
                  onClick={() => setEditItems(editItems.filter((_, k) => k !== i))}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <button
              className="text-link"
              type="button"
              onClick={() => setEditItems([...editItems, { name: '', amount: 0 }])}
            >
              <Plus size={16} />
              Add line item
            </button>
            <label>
              Work description
              <textarea
                required
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
              />
            </label>
            <div className="invoice-line total">
              <span>Repair total</span>
              <b>R{editItems.reduce((s, i) => s + Number(i.amount || 0), 0).toLocaleString()}</b>
            </div>
            <button className="primary full">
              Send demo quote for approval <ArrowRight size={16} />
            </button>
          </form>
        )}
        {dialog.kind === 'complete' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              jobAction(dialog.job, 'complete', {
                completionNotes: f.get('notes'),
                completedMileage: f.get('mileage'),
              });
            }}
          >
            <h2>Record the work performed.</h2>
            <p>
              {dialog.job.id} · {dialog.job.vehicle}
            </p>
            <label>
              Completed work
              <textarea
                name="notes"
                required
                placeholder="Record parts fitted, work performed, and checks completed."
              />
            </label>
            <label>
              Vehicle mileage (km)
              <input name="mileage" required type="number" min="0" />
            </label>
            <div className="notice">
              The customer will see the invoice. This demo records the service history after
              simulated payment.
            </div>
            <button className="primary full">Complete work & create demo invoice</button>
          </form>
        )}
        {['pay', 'receipt'].includes(dialog.kind) && (
          <>
            <span className="chip">
              {dialog.kind === 'pay' ? 'PAYMENT PREVIEW' : 'DEMO RECEIPT'}
            </span>
            <h2>{dialog.kind === 'pay' ? 'Your repair invoice.' : 'Payment simulated.'}</h2>
            <p>
              {dialog.job.id}
              <br />
              {dialog.job.provider} · {dialog.job.vehicle}
            </p>
            {dialog.job.items.map((i: any, k: number) => (
              <div className="invoice-line" key={k}>
                <span>{i.name}</span>
                <b>R{i.amount}</b>
              </div>
            ))}
            <div className="invoice-line total">
              <span>Total</span>
              <b>R{quoteTotal(dialog.job)}</b>
            </div>
            <div className="notice">
              No real payment processor is connected. No card details are requested and no money is
              transferred. Assessment fee is separate.
            </div>
            {dialog.kind === 'pay' ? (
              <button
                className="primary full"
                onClick={() =>
                  jobAction(dialog.job, 'pay', { mileage: dialog.job.completedMileage })
                }
              >
                Simulate payment <Wallet size={17} />
              </button>
            ) : (
              <div className="success-note">
                <CheckCircle2 size={20} />
                Demo payment recorded. Your service history has been updated.
              </div>
            )}
          </>
        )}
        {dialog.kind === 'cancel' && (
          <>
            <h2>Cancel this demo request?</h2>
            <p>
              {dialog.job.provider}
              <br />
              {dialog.job.date} at {dialog.job.time}
            </p>
            <button className="primary full" onClick={() => jobAction(dialog.job, 'cancel')}>
              Confirm cancellation
            </button>
            <button className="text-link back" onClick={() => setDialog(null)}>
              Keep appointment
            </button>
          </>
        )}
        {dialog.kind === 'record' && (
          <>
            <span className="chip">DIGITAL SERVICE RECORD · DEMO</span>
            <h2>{dialog.record.title}</h2>
            <p>
              {dialog.record.vehicle}
              <br />
              {dialog.record.date} · {dialog.record.mileage} km
            </p>
            <hr />
            <h3>Work performed</h3>
            <p>{dialog.record.notes}</p>
            <div className="notice">
              Professional: {dialog.record.provider}
              <br />
              This is illustrative data, not proof of a real service.
            </div>
          </>
        )}
        {dialog.kind === 'review' && (
          <>
            <span className="chip">APPLICATION REVIEW · DEMO</span>
            <h2>{dialog.app.name}</h2>
            <p>
              {dialog.app.type} · {dialog.app.city}
            </p>
            <Status value={dialog.app.status} />
            <h3 className="review-title">Evidence checklist</h3>
            {dialog.app.own ? (
              <>
                {data.documents.map((d: any) => (
                  <div className="document-row" key={d.id}>
                    <FileText size={19} />
                    <div>
                      <b>{d.kind}</b>
                      <small>{d.name} · Metadata only</small>
                    </div>
                  </div>
                ))}
                <p>{data.profile.bio}</p>
              </>
            ) : (
              <div className="notice">
                Illustrative applicant: identity and qualification files are placeholders. No real
                personal documents are available.
              </div>
            )}
            <p className="muted">
              Simulate each review step below. These checks do not validate any real identity or
              qualification.
            </p>
            {[
              'Identity reviewed',
              'Qualifications / experience reviewed',
              'Business and service details reviewed',
            ].map((c) => (
              <label className="check-label" key={c}>
                <input
                  type="checkbox"
                  checked={checks.includes(c)}
                  onChange={(e) =>
                    setChecks(e.target.checked ? [...checks, c] : checks.filter((v) => v !== c))
                  }
                />
                {c}
              </label>
            ))}
            <label className="field-label">
              Review notes
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Reason for decision or specific changes needed"
              />
            </label>
            <div className="button-row">
              <button className="primary" onClick={() => review(dialog.app, 'Approved')}>
                Approve demo application
              </button>
              <button className="secondary" onClick={() => review(dialog.app, 'Changes requested')}>
                Request changes
              </button>
              <button
                className="text-link"
                onClick={() =>
                  review(dialog.app, dialog.app.status === 'Approved' ? 'Suspended' : 'Rejected')
                }
              >
                {dialog.app.status === 'Approved' ? 'Suspend credential' : 'Reject application'}
              </button>
            </div>
          </>
        )}
        {dialog.kind === 'report' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const resolution = String(new FormData(e.currentTarget).get('resolution'));
              update((d: any) => ({
                ...d,
                reports: d.reports.map((r: any) =>
                  r.id === dialog.report.id ? { ...r, status: 'Resolved', resolution } : r,
                ),
              }));
              setDialog(null);
              notify('Sample report resolved.');
            }}
          >
            <span className="reference">{dialog.report.id}</span>
            <h2>{dialog.report.title}</h2>
            <p>{dialog.report.note}</p>
            <label>
              Resolution notes
              <textarea required name="resolution" />
            </label>
            <button className="primary full">
              Mark resolved in demo <Check size={17} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
