import { JobConversation } from '../../components/jobs/JobConversation';
import { BookingQuotations } from '../../components/jobs/BookingQuotations';
import { customerIdentityLabel } from '../../features/account/customerIdentity';
import { unreadMessageCount } from '../../features/messages/conversation';
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
import { Siren, MapPin } from 'lucide-react';

function ownerId(job: any, fallback: string) {
  return typeof job?.customerId === 'string' && job.customerId ? job.customerId : fallback;
}

export function BookingDetailPage({ data, go, notify, onPanel, panel = 'overview', setDialog, update, bookingId }: any) {
  const customerId = data?.settings?.id || demoCustomerId;
  const job = (data.jobs || []).find((item: any) => item.id === bookingId);
  const [tab, setTab] = useState(panel || 'overview');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const here = 'dashboard/bookings/' + encodeURIComponent(bookingId || '');
  const back = backTarget(here, 'dashboard/bookings');
  useEffect(() => {
    setTab(panel || 'overview');
    setSelected([]);
    setError('');
  }, [bookingId, panel]);
  function choose(next: string) {
    setTab(next);
    onPanel?.(next);
  }
  if (!job || ownerId(job, demoCustomerId) !== customerId) {
    return (
      <div className="detail-page">
        <DetailBack label="Back to My bookings" onClick={() => go('dashboard/bookings')} />
        <Card as="section" className="dash-panel">
          <h1>Booking not found</h1>
          <p>This booking is not available on this account.</p>
        </Card>
      </div>
    );
  }
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const records = (data.records || []).filter((record: any) => record.vehicleId === job.vehicleId);
  const grant = activeGrantForBooking(data, job.id);
  const events = Array.isArray(job.events) ? job.events : [];

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
      {job.kind === 'EMERGENCY' && <div className="roadside-detail-banner"><strong><Siren size={19}/> YOUR ROADSIDE ASSISTANCE REQUEST</strong><span>{job.emergencyType || 'Breakdown'} · <MapPin size={13} style={{ display: 'inline' }} /> {job.roadsideAddress || 'Location not provided'}</span><span>{job.status === 'Requested' ? 'Waiting for the professional to respond. This is not yet a confirmed dispatch.' : 'Use Messages to coordinate with the professional.'}</span></div>}
      <DetailCard title="Progress">
        <BookingProgress job={job} />
      </DetailCard>
      <DetailTabs
        id="booking-detail"
        label="Booking details"
        value={tab}
        onChange={choose}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'quote', label: 'Quotes & payments' },
          { id: 'messages', label: 'Messages', badge: job ? unreadMessageCount(data, job.id, 'customer') || undefined : undefined },
        ]}
      />
      <DetailPanel scope="booking-detail" tabId="overview" value={tab}>
      <DetailCard title="Appointment">
        <p>{job.description || 'No request description was saved.'}</p>
        <p className="muted">{job.kind === 'EMERGENCY' ? 'This urgent request has no scheduled appointment or guaranteed response time.' : 'A preferred time is not confirmed availability.'}</p>
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
          {job.status === 'Requested' && job.kind !== 'EMERGENCY' ? (
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
      <BookingQuotations job={job} setDialog={setDialog} />
      </DetailPanel>
      <DetailPanel scope="booking-detail" tabId="messages" value={tab}>
        <DetailCard title="Messages">
          <JobConversation
            active={tab === 'messages'}
            bookingId={job.id}
            data={data}
            job={job}
            notify={notify}
            update={update}
            viewerId={customerId}
            viewerName={customerIdentityLabel(data.settings?.name)}
            viewerRole="customer"
          />
        </DetailCard>
      </DetailPanel>
    </div>
  );
}
