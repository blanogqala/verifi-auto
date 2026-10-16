import { quoteTotal } from '../../features/jobs/jobWorkflow';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { demoCustomerId } from '../../features/admin/customerRecords';
import { canOfferHistoryAccess, activeGrantForBooking } from '../../features/garage/historyAccess';
import { grantHistoryAccess, revokeHistoryAccess } from '../../features/demo/demoActions';
import { useState } from 'react';

function ownerId(job: any, fallback: string) {
  return typeof job?.customerId === 'string' && job.customerId ? job.customerId : fallback;
}

export function BookingDetailPage({ data, go, notify, setDialog, update, bookingId }: any) {
  const customerId = data?.settings?.id || demoCustomerId;
  const job = (data.jobs || []).find((item: any) => item.id === bookingId);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  if (!job || ownerId(job, demoCustomerId) !== customerId) {
    return (
      <Card as="section" className="dash-panel">
        <h2>Booking not found</h2>
        <p>This booking is not part of the customer preview in this browser.</p>
        <button className="secondary" type="button" onClick={() => go('dashboard/bookings')}>
          Back to My bookings
        </button>
      </Card>
    );
  }
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const records = (data.records || []).filter((record: any) => record.vehicleId === job.vehicleId);
  const grant = activeGrantForBooking(data, job.id);
  const payable = job.status === 'Awaiting payment' && job.quoteApproved && job.paid !== true;
  const events = Array.isArray(job.events) ? job.events : [];

  return (
    <div className="booking-detail">
      <Card as="section" className="dash-panel">
        <span className="reference">{job.id}</span>
        <Status value={job.status} />
        <h2>{job.vehicleLabel || job.vehicle}</h2>
        {vehicle ? (
          <button className="text-link" type="button" onClick={() => go('dashboard/garage/' + encodeURIComponent(vehicle.id))}>
            {vehicle.registration || 'View vehicle'}
          </button>
        ) : (
          <p>Vehicle not linked. The saved description is “{job.vehicle || 'not recorded'}”.</p>
        )}
        {job.professionalId ? (
          <button
            className="text-link"
            type="button"
            onClick={() => go('dashboard/find/' + encodeURIComponent(job.professionalId))}
          >
            {job.provider}
          </button>
        ) : (
          <p>Professional not linked. Saved name: {job.provider || 'not recorded'}.</p>
        )}
        <p>
          Preferred appointment {job.date} at {job.time}. This time is a preference, not confirmed
          availability.
        </p>
        <h3>Original request</h3>
        <p>{job.description || 'No request description was saved.'}</p>
        <h3>Timeline</h3>
        {events.length ? (
          <ol className="booking-timeline">
            {events.map((event: any) => (
              <li key={event.at + event.type}>
                <time dateTime={event.at}>{event.at}</time> {event.label}
              </li>
            ))}
          </ol>
        ) : (
          <p>Status: {job.status}. No dated timeline was stored for this booking.</p>
        )}
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Assessment</h2>
        <p>Assessment fee R{job.fee}. This is separate from repair costs.</p>
        {job.items?.length ? (
          <>
            <h3>Parts and labour</h3>
            {job.items.map((item: any) => (
              <div className="invoice-line" key={item.name + item.amount}>
                <span>{item.name}</span>
                <b>R{Number(item.amount).toLocaleString()}</b>
              </div>
            ))}
            <div className="invoice-line total">
              <span>Repair total</span>
              <b>R{quoteTotal(job).toLocaleString()}</b>
            </div>
          </>
        ) : (
          <p>No repair quotation has been recorded.</p>
        )}
        {job.notes ? <p>{job.notes}</p> : null}
        {job.changeRequest ? <p>Change request: {job.changeRequest}</p> : null}
        {job.completionNotes ? <p>Completion: {job.completionNotes}</p> : null}
        {job.rejectionReason ? <p>Rejection reason: {job.rejectionReason}</p> : null}
        <p>
          Invoice status: {job.paid ? 'Demo paid' : payable ? 'Awaiting payment' : 'Not payable yet'}
          {job.paymentReference ? ` · ${job.paymentReference}` : ''}
        </p>
        <div className="button-row">
          {job.status === 'Requested' ? (
            <button className="secondary" type="button" onClick={() => setDialog({ kind: 'edit-booking', job })}>
              Edit request
            </button>
          ) : null}
          {job.status === 'Awaiting approval' ? (
            <>
              <button className="primary" type="button" onClick={() => setDialog({ kind: 'approve', job })}>
                Review & approve quote
              </button>
              <button className="secondary" type="button" onClick={() => setDialog({ kind: 'changes', job })}>
                Request changes
              </button>
            </>
          ) : null}
          {['Requested', 'Confirmed'].includes(job.status) ? (
            <button className="secondary" type="button" onClick={() => setDialog({ kind: 'cancel', job })}>
              Cancel request
            </button>
          ) : null}
          {payable ? (
            <button className="primary" type="button" onClick={() => setDialog({ kind: 'pay', job })}>
              Review & pay
            </button>
          ) : null}
        </div>
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Vehicle history access</h2>
        <p className="muted">
          Demo permission only. A real product must enforce this on the server. Hiding records in
          the browser is not security.
        </p>
        <p>Professional: {job.provider || 'Not linked'}</p>
        <p>Vehicle: {job.vehicleLabel || job.vehicle || 'Not linked'}</p>
        <p>Booking: {job.id}</p>
        <p>Access: {grant ? 'Granted' : 'No access'}</p>
        {canOfferHistoryAccess(job) ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const saved = update((current: any) =>
                  grantHistoryAccess(current, { bookingId: job.id, customerId, recordIds: selected }),
                );
                setError('');
                notify(saved ? 'Demo access granted in this browser.' : 'Could not store this access change.');
              } catch (reason: any) {
                setError(reason.message);
              }
            }}
          >
            {records.length ? (
              records.map((record: any) => (
                <label className="check-label" key={record.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(record.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, record.id]
                          : current.filter((id) => id !== record.id),
                      )
                    }
                  />
                  {record.title} · {record.date}
                </label>
              ))
            ) : (
              <p>No linked records are available to share for this vehicle.</p>
            )}
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary" type="submit" disabled={!records.length}>
              Grant access
            </button>
          </form>
        ) : (
          <p>History sharing opens after this professional accepts the booking, and ends when the booking ends.</p>
        )}
        {grant?.status === 'active' ? (
          <button
            className="secondary"
            type="button"
            onClick={() => {
              try {
                const saved = update((current: any) => revokeHistoryAccess(current, grant.id, customerId));
                notify(saved ? 'Demo access revoked in this browser.' : 'Could not store this access change.');
              } catch (reason: any) {
                notify(reason.message);
              }
            }}
          >
            Revoke access
          </button>
        ) : null}
      </Card>
    </div>
  );
}
