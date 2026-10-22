import { quoteReviewToken } from '../../features/jobs/quotations';
import { QuoteReview } from '../jobs/QuoteReview';
import { PaintColourField } from '../garage/PaintColourField';
import { ArrowRight, Check, X, FileText, CheckCircle2, Wallet, Plus, Trash2 } from 'lucide-react';
import { activeMechanicProfessionalId, quoteTotal } from '../../demo';
import { pricingNote } from '../../features/jobs/pricingModel';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { activeVehicles, vehicleOptionLabel } from '../../features/demo/links';
import { bodyStyleOptions } from '../../features/garage/vehicleCatalogue';
import { removeOrArchiveVehicle, resolveHistoryVehicle, saveVehicle, updateRequestedBooking } from '../../features/demo/demoActions';
import { bookingReference } from '../../features/jobs/jobViews';
import { sharedRecordsForProfessional } from '../../features/garage/historyAccess';
import { demoCustomerId } from '../../features/admin/customerRecords';
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
  liveActions,
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
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const vehicle = {
                id: dialog.vehicle?.id,
                make: f.get('make'),
                model: f.get('model'),
                year: f.get('year'),
                registration: f.get('registration'),
                mileage: f.get('mileage'),
                licenceDiscExpiry: f.get('licenceDiscExpiry'),
                licenceDiscSource: f.get('licenceDiscSource'),
                nextServiceDate: f.get('nextServiceDate'),
                nextServiceMileage: f.get('nextServiceMileage'),
                nextServiceSource: f.get('nextServiceSource'),
                archived: dialog.vehicle?.archived === true,
                variant: f.get('variant'),
                bodyStyle: f.get('bodyStyle'),
                paintColor: f.get('paintColor'),
                paintColorName: f.get('paintColorName'),
              };
              if (liveActions?.saveVehicle) {
                const saved = await liveActions.saveVehicle(vehicle);
                if (saved !== false) setDialog(null);
                return;
              }
              try {
                const saved = commitUpdate(
                  update,
                  (d: any) => saveVehicle(d, vehicle),
                  notify,
                  '',
                );
                if (!saved) return;
                setDialog(null);
                notify('Sample vehicle saved.');
              } catch (reason: any) {
                notify(reason.message);
              }
            }}
          >
            <h2>{dialog.vehicle ? 'Edit vehicle' : 'Add vehicle'}</h2>
            <p className="muted">Enter the vehicle details you want to keep with this garage.</p>
            <div className="form-row">
              <label>
                Make
                <input name="make" required autoComplete="off" defaultValue={dialog.vehicle?.make} />
              </label>
              <label>
                Model
                <input name="model" required autoComplete="off" defaultValue={dialog.vehicle?.model} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Body style
                <select name="bodyStyle" defaultValue={dialog.vehicle?.bodyStyle || ''}>
                  <option value="">Not specified</option>
                  {bodyStyleOptions.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Variant
                <input name="variant" defaultValue={dialog.vehicle?.variant || ''} />
              </label>
            </div>
            <PaintColourField key={dialog.vehicle?.id || "new"} color={dialog.vehicle?.paintColor} name={dialog.vehicle?.paintColorName} />
            <div className="form-row">
              <label>
                Year
                <input
                  name="year"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
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
                  inputMode="numeric"
                  autoComplete="off"
                  min="0"
                  max="9999999"
                  required
                  defaultValue={dialog.vehicle?.mileage || 0}
                />
              </label>
            </div>
            <label>
              Registration
              <input
                name="registration"
                required
                autoComplete="off"
                defaultValue={dialog.vehicle?.registration || (liveActions ? '' : 'DEMO 002')}
              />
            </label>
            <div className="form-row">
              <label>
                Licence disc expiry
                <input name="licenceDiscExpiry" type="date" defaultValue={dialog.vehicle?.licenceDiscExpiry || ''} />
              </label>
              <label>
                Who recorded the licence date
                <select name="licenceDiscSource" defaultValue={dialog.vehicle?.licenceDiscSource || 'owner'}>
                  <option value="owner">Entered by the owner</option>
                  <option value="mechanic">Recorded by a mechanic</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Next service date
                <input name="nextServiceDate" type="date" defaultValue={dialog.vehicle?.nextServiceDate || ''} />
              </label>
              <label>
                Next service mileage
                <input
                  name="nextServiceMileage"
                  type="number"
                  min="0"
                  defaultValue={dialog.vehicle?.nextServiceMileage || ''}
                />
              </label>
            </div>
            <label>
              Who recorded the next service
              <select name="nextServiceSource" defaultValue={dialog.vehicle?.nextServiceSource || 'owner'}>
                <option value="owner">Entered by the owner</option>
                <option value="mechanic">Recorded by a mechanic</option>
              </select>
            </label>
            <p className="muted">Leave a date blank when it has not been recorded. No service interval is assumed.</p>
            <button className="primary full">
              Save vehicle <Check size={17} />
            </button>
          </form>
        )}
        {dialog.kind === 'job' && (
          <>
            <span className="reference">{bookingReference(dialog.job)}</span>
            <h2>{dialog.job.vehicle}</h2>
            <Status value={dialog.job.status} />
            <p>
              {dialog.job.provider}
              <br />
              {dialog.job.date} at {dialog.job.time}
            </p>
            <div className="notice">{pricingNote(dialog.job)}</div>
            {dialog.job.items?.length > 0 && (
              <>
                <h3>Repair quote</h3>
                {dialog.job.items.filter((i: any) => i.approved !== false).map((i: any, k: number) => (
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
            {dialog.job.rejectionReason && (
              <div className="notice">
                <b>Rejection reason:</b> {dialog.job.rejectionReason}
              </div>
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
                    <>
                      <button className="primary" onClick={() => jobAction(dialog.job, 'confirm')}>
                        Accept request
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setDialog({ ...dialog, kind: 'reject' })}
                      >
                        Reject request
                      </button>
                    </>
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
            {role === 'mechanic'
              ? sharedRecordsForProfessional(data, dialog.job, activeMechanicProfessionalId(data)).map(
                  (record: any) => (
                    <p key={record.id}>
                      Shared history: {record.title} · {record.date}
                    </p>
                  ),
                )
              : null}
          </>
        )}
        {['approve', 'changes'].includes(dialog.kind) && (
          <QuoteReview key={dialog.job.id + ':' + (dialog.job.quoteVersion || 0)} job={dialog.job} onAction={jobAction} />
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
            <span className="chip">{bookingReference(dialog.job)}</span>
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
              {bookingReference(dialog.job)} · {dialog.job.vehicle}
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
        {dialog.kind === 'reject' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get('reason') || '');
              jobAction(dialog.job, 'reject', { reason });
            }}
          >
            <h2>Reject this request?</h2>
            <p>
              {bookingReference(dialog.job)} · {dialog.job.vehicle}. The customer will see this reason. Only a
              pending request can be rejected.
            </p>
            <label>
              Reason
              <textarea name="reason" required minLength={3} maxLength={240} />
            </label>
            <button className="primary full">Reject request</button>
          </form>
        )}
        {['pay', 'receipt', 'invoice'].includes(dialog.kind) && (
          <>
            <span className="chip">
              {dialog.kind === 'receipt' ? 'DEMO RECEIPT' : 'PAYMENT PREVIEW'}
            </span>
            <h2>
              {dialog.kind === 'receipt'
                ? 'Payment simulated.'
                : dialog.kind === 'invoice'
                  ? 'Repair invoice.'
                  : 'Demo checkout.'}
            </h2>
            <p>
              {bookingReference(dialog.job)}
              <br />
              {dialog.job.provider} · {dialog.job.vehicle}
            </p>
            {dialog.job.items.filter((i: any) => i.approved !== false).map((i: any, k: number) => (
              <div className="invoice-line" key={k}>
                <span>{i.name}</span>
                <b>R{i.amount}</b>
              </div>
            ))}
            <div className="invoice-line total">
              <span>Total</span>
              <b>R{quoteTotal(dialog.job)}</b>
              {dialog.job.quoteNumber ? <span>Quotation {dialog.job.quoteNumber}</span> : null}
            </div>
            <div className="notice">
              No real payment processor is connected. No card details are requested and no money is
              transferred. {pricingNote(dialog.job)}
            </div>
            {dialog.job.paid ? <p>Demo payment reference: {dialog.job.paymentReference || 'Not recorded'}<br />Recorded: {dialog.job.paidAt || 'Date not recorded'}</p> : null}
            {dialog.kind === 'invoice' ? (
              <div className="notice">
                {dialog.job.paid ? 'Demo payment recorded. This is a demo invoice, not a tax invoice or confirmation of a bank payout.' : 'Payment has not been recorded.'}
              </div>
            ) : null}
            {dialog.kind === 'pay' && role === 'customer' ? (
              <button
                className="primary full"
                onClick={() =>
                  jobAction(dialog.job, 'pay', { mileage: dialog.job.completedMileage, reviewToken: quoteReviewToken(dialog.job) })
                }
              >
                Simulate payment <Wallet size={17} />
              </button>
            ) : dialog.kind === 'receipt' ? (
              <div className="success-note">
                <CheckCircle2 size={20} />
                Demo payment recorded. Service history is updated when the work is completed.
              </div>
            ) : null}
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
        {dialog.kind === 'archive-vehicle' && (
          <>
            <h2>{dialog.linked ? 'Archive this vehicle?' : 'Remove this vehicle?'}</h2>
            <p>
              {dialog.vehicle.year} {dialog.vehicle.make} {dialog.vehicle.model} · {dialog.vehicle.registration}
            </p>
            <p className="muted">
              {liveActions
                ? 'Bookings and service records are kept. The vehicle leaves the showroom.'
                : dialog.linked
                  ? 'Bookings and service records stay in this browser. The vehicle leaves the showroom.'
                  : 'This vehicle has no linked bookings or service records.'}
            </p>
            <button
              className="primary full"
              type="button"
              onClick={async () => {
                if (liveActions?.archiveVehicle) {
                  const saved = await liveActions.archiveVehicle(dialog.vehicle);
                  if (saved !== false) setDialog(null);
                  return;
                }
                const saved = commitUpdate(
                  update,
                  (current: any) => removeOrArchiveVehicle(current, dialog.vehicle.id),
                  notify,
                  '',
                );
                if (!saved) return;
                setDialog(null);
                notify(
                  dialog.linked
                    ? 'Vehicle archived. Bookings, invoices, and service history stay in this browser.'
                    : 'Vehicle removed from this browser.',
                );
              }}
            >
              {dialog.linked ? 'Archive vehicle' : 'Remove vehicle'}
            </button>
          </>
        )}
        {dialog.kind === 'edit-booking' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                const saved = commitUpdate(
                  update,
                  (current: any) =>
                    updateRequestedBooking(current, {
                      bookingId: dialog.job.id,
                      customerId: data.settings?.id || demoCustomerId,
                      vehicleId: String(form.get('vehicleId') || ''),
                      date: String(form.get('date') || ''),
                      time: String(form.get('time') || ''),
                      description: String(form.get('description') || ''),
                    }),
                  notify,
                  '',
                );
                if (!saved) return;
                setDialog(null);
                notify('Demo request updated in this browser.');
              } catch (reason: any) {
                notify(reason.message);
              }
            }}
          >
            <h2>Edit request</h2>
            <p className="muted">Pending requests can be edited. Accepted quotations stay unchanged.</p>
            <label>
              Vehicle
              <select name="vehicleId" defaultValue={dialog.job.vehicleId || ''} required>
                {activeVehicles(data.vehicles || []).map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicleOptionLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Preferred date
                <input name="date" type="date" required defaultValue={dialog.job.date} />
              </label>
              <label>
                Preferred time
                <select name="time" defaultValue={dialog.job.time}>
                  {['09:00', '11:00', '14:00', '16:00'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              What needs attention?
              <textarea name="description" required minLength={3} defaultValue={dialog.job.description || ''} />
            </label>
            <button className="primary full" type="submit">
              Save changes
            </button>
          </form>
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
        {dialog.kind === 'customer' && (
          <>
            <span className="chip">SAMPLE CUSTOMER · DEMO</span>
            <h2>{dialog.customer.name || 'Name not recorded'}</h2>
            <p>
              {dialog.customer.email || 'Email not recorded'}
              <br />
              {dialog.customer.phone || 'Phone not recorded'}
              {dialog.customer.city ? ` · ${dialog.customer.city}` : ''}
            </p>
            <h3>Bookings</h3>
            {dialog.bookings?.length ? (
              dialog.bookings.map((job: any) => (
                <div className="document-row" key={job.id}>
                  <div>
                    <b>{bookingReference(job)}</b>
                    <small>
                      {job.vehicle} · {job.provider || 'Mechanic not recorded'} · {job.status}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No demo bookings are linked to this customer.</p>
            )}
            <div className="notice">
              This is a read-only sample record. It does not change the customer account.
            </div>
          </>
        )}
        {dialog.kind === 'resolve-history' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const saved = commitUpdate(
                update,
                (current: any) =>
                  resolveHistoryVehicle(current, {
                    jobId: dialog.item.historyKind === 'job' ? dialog.item.id : undefined,
                    recordId: dialog.item.historyKind === 'record' ? dialog.item.id : undefined,
                    vehicleId: String(form.get('vehicleId') || ''),
                    confirmed: form.get('confirm') === 'on',
                  }),
                notify,
                'History linked to the selected registration.',
              );
              if (saved) setDialog(null);
            }}
          >
            <h2>Link this history</h2>
            <p>
              <b>{dialog.item.title || dialog.item.status || 'History record'}</b>
              <br />
              {dialog.item.vehicleLabel || dialog.item.vehicle || 'Vehicle name not recorded'}
              {dialog.item.provider ? ` · ${dialog.item.provider}` : ''}
            </p>
            <p className="muted">
              Choose the registration yourself. The saved vehicle name is not used to decide this.
            </p>
            <label>
              Vehicle registration
              <select name="vehicleId" required defaultValue="">
                <option value="">Select a registration</option>
                {(data.vehicles || []).map((vehicle: any) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicleOptionLabel(vehicle)}
                    {vehicle.archived ? ' · archived' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input name="confirm" type="checkbox" required />
              I confirm this record belongs to the selected registration
            </label>
            <button className="primary full" type="submit">
              Link history
            </button>
          </form>
        )}
        {dialog.kind === 'report' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const resolution = String(new FormData(e.currentTarget).get('resolution'));
              const saved = commitUpdate(
                update,
                (d: any) => ({
                  ...d,
                  reports: d.reports.map((r: any) =>
                    r.id === dialog.report.id ? { ...r, status: 'Resolved', resolution } : r,
                  ),
                }),
                notify,
                'Sample report resolved.',
              );
              if (saved) setDialog(null);
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
