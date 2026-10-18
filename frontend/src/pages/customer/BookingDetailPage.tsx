import { quoteTotal } from '../../features/jobs/jobWorkflow';
import { Card } from '../../components/ui/Card';
import { DetailPanel, DetailTabs } from '../../components/ui/DetailTabs';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../../components/ui/DetailChrome';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { BookingProgress } from '../../components/jobs/BookingProgress';
import { demoCustomerId } from '../../features/admin/customerRecords';
import { canOfferHistoryAccess, activeGrantForBooking } from '../../features/garage/historyAccess';
import { grantHistoryAccess, revokeHistoryAccess } from '../../features/demo/demoActions';
import { bookingReference } from '../../features/jobs/jobViews';
import { formatDay, formatWhen } from '../../features/jobs/bookingProgress';
import { backTarget, followDetail, returnLabel } from '../../features/navigation/returnPath';
import { useEffect, useState } from 'react';

function ownerId(job: any, fallback: string) {
  return typeof job?.customerId === 'string' && job.customerId ? job.customerId : fallback;
}

function lineKind(item: any) {
  const kind = String(item?.category || item?.kind || '').toLowerCase();
  if (kind === 'part' || kind === 'parts') return 'Part';
  if (kind === 'labour' || kind === 'labor') return 'Labour';
  return '';
}

function lineQty(item: any) {
  const value = Number(item?.quantity ?? item?.qty);
  return Number.isFinite(value) ? value : null;
}

export function BookingDetailPage({ data, go, notify, setDialog, update, bookingId }: any) {
  const customerId = data?.settings?.id || demoCustomerId;
  const job = (data.jobs || []).find((item: any) => item.id === bookingId);
  const [tab, setTab] = useState('overview');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const here = 'dashboard/bookings/' + encodeURIComponent(bookingId || '');
  const back = backTarget(here, 'dashboard/bookings');
  useEffect(() => {
    setTab('overview');
    setSelected([]);
    setError('');
  }, [bookingId]);
  if (!job || ownerId(job, demoCustomerId) !== customerId) {
    return (
      <div className="detail-page">
        <DetailBack label="Back to My bookings" onClick={() => go('dashboard/bookings')} />
        <Card as="section" className="dash-panel">
          <h1>Booking not found</h1>
          <p>This booking is not part of the customer preview in this browser.</p>
        </Card>
      </div>
    );
  }
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const records = (data.records || []).filter((record: any) => record.vehicleId === job.vehicleId);
  const grant = activeGrantForBooking(data, job.id);
  const payable = job.status === 'Awaiting payment' && job.quoteApproved && job.paid !== true;
  const events = Array.isArray(job.events) ? job.events : [];
  const total = quoteTotal(job);
  const paymentLabel = job.paid ? 'Demo paid' : payable ? 'Awaiting payment' : 'Not payable yet';
  const showQty = Array.isArray(job.items) && job.items.some((item: any) => lineQty(item) != null);

  return (
    <div className="detail-page booking-detail">
      <DetailBack label={returnLabel(back)} onClick={() => go(back)} />
      <DetailHeader
        kicker={bookingReference(job)}
        title={job.vehicleLabel || job.vehicle || 'Booking'}
        summary={
          <span>
            {job.provider || 'Professional not recorded'}
            {' · '}
            {job.date ? formatDay(job.date) : 'Date not recorded'}
            {job.time ? ` at ${job.time}` : ''}
          </span>
        }
        aside={<Status value={job.status} />}
      />
      <DetailCard title="Progress">
        <BookingProgress job={job} />
      </DetailCard>
      <DetailTabs
        id="booking-detail"
        label="Booking details"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'quote', label: 'Quote & payment' },
        ]}
      />
      <DetailPanel scope="booking-detail" tabId="overview" value={tab}>
      <DetailCard title="Appointment">
        <p>{job.description || 'No request description was saved.'}</p>
        <p className="muted">A preferred time is not confirmed availability.</p>
        <DetailFields
          items={[
            { label: 'Professional', value: job.provider || 'Not linked' },
            {
              label: 'Vehicle',
              value: vehicle
                ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
                : job.vehicle || 'Not linked',
            },
            { label: 'Registration', value: vehicle?.registration || 'Not recorded' },
          ]}
        />
        <div className="button-row">
          {job.professionalId ? (
            <button
              className="secondary"
              type="button"
              onClick={() => followDetail(go, here, 'dashboard/find/' + encodeURIComponent(job.professionalId))}
            >
              View professional
            </button>
          ) : null}
          {vehicle ? (
            <button
              className="secondary"
              type="button"
              onClick={() => followDetail(go, here, 'dashboard/garage/' + encodeURIComponent(vehicle.id))}
            >
              View vehicle
            </button>
          ) : null}
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
        </div>
      </DetailCard>
      <details className="fold">
        <summary>History sharing</summary>
        <p className="muted">Choose which service records this professional can see for this booking.</p>
        <DetailFields
          items={[
            { label: 'Access', value: grant ? 'Granted' : 'No access' },
            { label: 'Ends', value: 'When this booking is cancelled, rejected, or completed' },
          ]}
        />
        {canOfferHistoryAccess(job) ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const saved = update((current: any) =>
                  grantHistoryAccess(current, { bookingId: job.id, customerId, recordIds: selected }),
                );
                setError('');
                notify(saved ? 'Access granted for this booking.' : 'Could not store this access change.');
              } catch (reason: any) {
                setError(reason.message);
              }
            }}
          >
            <fieldset className="share-records">
              <legend>Records you can share</legend>
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
                    <span>
                      {record.title || 'Service record'}
                      <small>{record.date ? formatDay(record.date) : 'Date not recorded'}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p>No linked records are available to share for this vehicle.</p>
              )}
            </fieldset>
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
                notify(saved ? 'Access revoked for this booking.' : 'Could not store this access change.');
              } catch (reason: any) {
                notify(reason.message);
              }
            }}
          >
            Revoke access
          </button>
        ) : null}
      </details>
      <details className="fold">
        <summary>Activity history</summary>
        {events.length ? (
          <ol className="activity-list">
            {events.map((event: any) => (
              <li key={event.at + event.type}>
                <time dateTime={event.at}>{formatWhen(event.at) || 'Time not recorded'}</time>
                <span>{event.label || event.type}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>No dated timeline was stored for this booking. The progress steps above use the current status only.</p>
        )}
      </details>
      </DetailPanel>
      <DetailPanel scope="booking-detail" tabId="quote" value={tab}>
      <DetailCard title="Quote and payment">
        {job.items?.length ? (
          <div className="quote-table">
            <div className={'quote-head' + (showQty ? ' quote-head-qty' : '')}>
              <span>Description</span>
              {showQty ? <span>Qty</span> : null}
              <span>Amount</span>
            </div>
            {job.items.map((item: any) => (
              <div className={'quote-line' + (showQty ? ' quote-line-qty' : '')} key={item.name + item.amount}>
                <span>
                  {lineKind(item) ? <small>{lineKind(item)}</small> : null}
                  {item.name}
                </span>
                {showQty ? <span>{lineQty(item) ?? '—'}</span> : null}
                <b>R{Number(item.amount).toLocaleString()}</b>
              </div>
            ))}
            <div className={'quote-line quote-total' + (showQty ? ' quote-line-qty' : '')}>
              <span>Total</span>
              {showQty ? <span /> : null}
              <b>R{total.toLocaleString()}</b>
            </div>
          </div>
        ) : (
          <p>No repair quotation has been recorded.</p>
        )}
        <DetailFields
          items={[
            { label: 'Assessment fee', value: `R${Number(job.fee || 0).toLocaleString()}` },
            { label: 'Approval', value: job.quoteApproved ? 'Approved' : 'Not approved' },
            { label: 'Payment', value: paymentLabel },
            { label: 'Reference', value: job.paymentReference || 'Not recorded' },
            { label: 'Paid', value: job.paidAt ? formatWhen(job.paidAt) : 'Not recorded' },
          ]}
        />
        <p className="muted">The assessment fee is separate from the quotation total.</p>
        {job.notes ? <p>{job.notes}</p> : null}
        {job.changeRequest ? <p>Change request: {job.changeRequest}</p> : null}
        {job.completionNotes ? <p>Completion: {job.completionNotes}</p> : null}
        {job.rejectionReason ? <p>Rejection reason: {job.rejectionReason}</p> : null}
        <div className="button-row">
          {job.status === 'Awaiting approval' ? (
            <>
              <button className="primary" type="button" onClick={() => setDialog({ kind: 'approve', job })}>
                Review and approve
              </button>
              <button className="secondary" type="button" onClick={() => setDialog({ kind: 'changes', job })}>
                Request changes
              </button>
            </>
          ) : null}
          {payable ? (
            <button className="primary" type="button" onClick={() => setDialog({ kind: 'pay', job })}>
              Review and pay
            </button>
          ) : null}
          {job.paid ? (
            <button className="secondary" type="button" onClick={() => setDialog({ kind: 'receipt', job })}>
              View receipt
            </button>
          ) : job.items?.length ? (
            <button className="secondary" type="button" onClick={() => setDialog({ kind: 'invoice', job })}>
              View invoice
            </button>
          ) : null}
        </div>
      </DetailCard>
      </DetailPanel>
    </div>
  );
}
