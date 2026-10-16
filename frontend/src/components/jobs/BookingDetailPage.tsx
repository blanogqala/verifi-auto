import { quoteTotal } from '../../features/jobs/jobWorkflow';
import { demoCustomerId } from '../../features/admin/customerRecords';
import { canOfferHistoryAccess, activeGrantForBooking, grantHistoryAccess, revokeHistoryAccess } from '../../features/garage/historyAccess';
import { StatusBadge as Status } from '../ui/StatusBadge';
import { Card } from '../ui/Card';
import { useState } from 'react';

function ownerId(job: any, settingsId: string) {
  return typeof job?.customerId === 'string' && job.customerId ? job.customerId : demoCustomerId;
}

export function BookingDetailPage({ data, go, jobId, notify, setDialog, update }: any) {
  const job = (data.jobs || []).find((item: any) => item.id === jobId);
  const customerId = data.settings?.id || demoCustomerId;
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  if (!job || ownerId(job, customerId) !== customerId) {
    return (
      <Card as="section" className="dash-panel">
        <h2>Booking not found</h2>
        <p>This booking is not on the customer account in this browser.</p>
        <button className="secondary" type="button" onClick={() => go('dashboard/bookings')}>
          Back to My bookings
        </button>
      </Card>
    );
  }
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const records = (data.records || []).filter((record: any) => record.vehicleId && record.vehicleId === job.vehicleId);
  const grant = activeGrantForBooking(data, job.id);
  const events = Array.isArray(job.events) ? job.events : [];
  const payable = job.status === 'Awaiting payment' && job.quoteApproved && job.paid !== true;

  function share() {
    setError('');
    try {
      const saved = update((current: any) =>
        grantHistoryAccess(current, { bookingId: job.id, customerId, recordIds: selected }),
      );
      notify(saved ? 'Demo history access saved in this browser.' : 'Could not store this change in this browser.');
    } catch (reason: any) {
      setError(reason.message);
    }
  }

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
        <p>
          {job.professionalId ? (
            <button
              className="text-link"
              type="button"
              onClick={() => go('dashboard/find/' + encodeURIComponent(job.professionalId))}
            >
              {job.provider}
            </button>
          ) : (
            <>{job.provider || 'Professional not linked'}</>
          )}
        </p>
        <p>
          {job.date} at {job.time}
        </p>
        <h3>Original request</h3>
        <p>{job.description || 'No request description was stored.'}</p>
        {job.status === 'Requested' ? (
          <button className="secondary" type="button" onClick={() => setDialog({ kind: 'edit-booking', job })}>
            Edit request
          </button>
        ) : null}
        {['Requested', 'Confirmed'].includes(job.status) ? (
          <button className="secondary" type="button" onClick={() => setDialog({ kind: 'cancel', job })}>
            Cancel request
          </button>
        ) : null}
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Timeline</h2>
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
        <p>Assessment fee: R{job.fee}. This is separate from repair parts and labour.</p>
        {job.items?.length ? (
          <>
            <h3>Parts and labour</h3>
            {job.items.map((item: any, index: number) => (
              <div className="invoice-line" key={item.name + index}>
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
          <p>No repair quotation has been stored.</p>
        )}
        {job.notes ? <p>{job.notes}</p> : null}
        {job.status === 'Awaiting approval' ? (
          <div className="button-row">
            <button className="primary" type="button" onClick={() => setDialog({ kind: 'approve', job })}>
              Review & approve quote
            </button>
            <button className="secondary" type="button" onClick={() => setDialog({ kind: 'changes', job })}>
              Request changes
            </button>
          </div>
        ) : null}
        {job.changeRequest ? <p>Change request: {job.changeRequest}</p> : null}
        {job.completionNotes ? <p>Work performed: {job.completionNotes}</p> : null}
        <h3>Payment</h3>
        <p>{job.paid ? `Demo payment recorded ${job.paidAt || ''} ${job.paymentReference || ''}` : job.status}</p>
        {payable ? (
          <button className="primary" type="button" onClick={() => setDialog({ kind: 'pay', job })}>
            Review & pay
          </button>
        ) : null}
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Vehicle history access</h2>
        <p className="muted">
          Demo permission only. A real product must enforce this on the server. Hiding records in
          the browser is not security. Nothing is shared until you grant access.
        </p>
        {grant ? (
          <p>
            {job.provider} can view {grant.recordIds.length} record{grant.recordIds.length === 1 ? '' : 's'} for{' '}
            {job.vehicleLabel || job.vehicle} on {job.id}. Access is active.
            <button
              className="secondary"
              type="button"
              onClick={() => {
                try {
                  const saved = update((current: any) => revokeHistoryAccess(current, grant.id, customerId));
                  notify(
                    saved
                      ? 'Demo history access revoked in this browser.'
                      : 'Could not store this change in this browser.',
                  );
                } catch (reason: any) {
                  setError(reason.message);
                }
              }}
            >
              Revoke access
            </button>
          </p>
        ) : canOfferHistoryAccess(job) ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              share();
            }}
          >
            <p>
              Share selected records for this vehicle with {job.provider} for booking {job.id}.
            </p>
            {records.length ? (
              records.map((record: any) => (
                <label className="check-label" key={record.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(record.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id),
                      )
                    }
                  />
                  {record.title} · {record.date}
                </label>
              ))
            ) : (
              <p>No linked records are available to share for this vehicle.</p>
            )}
            <button className="primary" type="submit" disabled={!records.length}>
              Grant access
            </button>
          </form>
        ) : (
          <p>History sharing opens after this professional accepts the booking, and ends when the booking ends.</p>
        )}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
