import { JobConversation } from '../../components/jobs/JobConversation';
import { BookingRequestCard, ProfessionalDetailsCard } from '../../components/jobs/BookingInfoCards';
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
import { useEffect, useRef, useState } from 'react';
import { Siren, MapPin, ShieldCheck } from 'lucide-react';
import { InlineWorkReport } from '../../components/jobs/VehicleActivityRecord';
import { ServiceConfirmationCard } from '../../components/jobs/ServiceConfirmationCard';
import { markNotificationsRead, unreadBookingNotices } from '../../features/notifications/inbox';

function ownerId(job: any, fallback: string) {
  return typeof job?.customerId === 'string' && job.customerId ? job.customerId : fallback;
}

export function BookingDetailPage({ data, go, notify, onPanel, panel = 'overview', focusSection = '', setDialog, update, bookingId, professionals = [] }: any) {
  const customerId = data?.settings?.id || demoCustomerId;
  const job = (data.jobs || []).find((item: any) => item.id === bookingId);
  const [tab, setTab] = useState(panel || 'overview');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const varDetails = useRef<HTMLDetailsElement>(null);
  const activityDetails = useRef<HTMLDetailsElement>(null);
  const here = 'dashboard/bookings/' + encodeURIComponent(bookingId || '');
  const back = backTarget(here, 'dashboard/bookings');
  useEffect(() => {
    setTab(panel || 'overview');
    setSelected([]);
    setError('');
  }, [bookingId, panel]);
  function acknowledge(section: 'var' | 'activity') {
    const ids = unreadBookingNotices(data, 'customer', bookingId, section).map((note: any) => note.id);
    if (!ids.length) return;
    void Promise.resolve(update((current: any) =>
      markNotificationsRead(current, { role: 'customer', id: customerId, ids }))).catch((reason: any) =>
      notify(reason?.message || 'Could not mark this update as read.'));
  }
  useEffect(() => {
    if (!['var', 'activity'].includes(focusSection)) return;
    const node = focusSection === 'var' ? varDetails.current : activityDetails.current;
    if (!node) return;
    node.open = true;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    acknowledge(focusSection as 'var' | 'activity');
  }, [bookingId, focusSection]);
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
  const professional = (professionals || []).find((item: any) => item.id === job.professionalId);
  const records = (data.records || []).filter((record: any) => record.vehicleId === job.vehicleId);
  const grant = activeGrantForBooking(data, job.id);
  const pendingGrant = (data.historyAccess || []).find((g: any) => g.bookingId === job.id && g.status === 'requested');
  const varAttention = unreadBookingNotices(data, 'customer', job.id, 'var').length > 0;
  const activityAttention = unreadBookingNotices(data, 'customer', job.id, 'activity').length > 0;

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
      {job.kind === 'EMERGENCY' && <div className="roadside-detail-banner"><strong><Siren size={19}/> YOUR ROADSIDE ASSISTANCE REQUEST</strong><span>{job.emergencyType || 'Breakdown'} · <MapPin size={13} style={{ display: 'inline' }} /> {job.roadsideAddress || 'Location not provided'}</span>{job.roadsideLatitude != null && job.roadsideLongitude != null && <a className="roadside-directions" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(job.roadsideLatitude + ',' + job.roadsideLongitude)}>Open location in Maps</a>}<span>{job.status === 'Requested' ? 'Waiting for the professional to respond. This is not yet a confirmed dispatch.' : 'Use Messages to coordinate with the professional.'}</span></div>}
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
        <div className="booking-overview-grid">
          <BookingRequestCard
            job={job}
            vehicle={vehicle}
            showVehicle
            onViewVehicle={vehicle ? () => followDetail(go, here, 'dashboard/garage/' + encodeURIComponent(vehicle.id)) : undefined}
          >
            {job.status === 'Requested' && job.kind !== 'EMERGENCY' || ['Requested', 'Confirmed'].includes(job.status) ? (
              <div className="booking-detail-actions">
                {job.status === 'Requested' && job.kind !== 'EMERGENCY' &&
                  <button className="secondary" type="button" onClick={() => setDialog({ kind: 'edit-booking', job })}>Edit request</button>}
                {['Requested', 'Confirmed'].includes(job.status) &&
                  <button className="secondary" type="button" onClick={() => setDialog({ kind: 'cancel', job })}>Cancel request</button>}
              </div>
            ) : null}
          </BookingRequestCard>
          <ProfessionalDetailsCard
            job={job}
            professional={professional}
            onView={job.professionalId ? () => followDetail(go, here, 'dashboard/find/' + encodeURIComponent(job.professionalId)) : undefined}
          >
            <ServiceConfirmationCard job={job} customerId={customerId} data={data} update={update} notify={notify}/>
          </ProfessionalDetailsCard>
        </div>
      <details ref={varDetails} className={'fold var-customer-panel' + (varAttention ? ' has-unread-attention' : '')}
        onToggle={(event) => { if (event.currentTarget.open) acknowledge('var'); }}>
        <summary><span>Vehicle Activity Record (VAR)</span>
          {varAttention && <span className="var-attention-dot" aria-label="New VAR access request" title="New VAR access request" />}
        </summary>
        {pendingGrant && (
          <div className="var-customer-request" role="status">
            <ShieldCheck size={20}/>
            <div><strong>Your workshop requested access to your Vehicle Activity Record.</strong>
              <p>Choose the previous completed services you want to share. The workshop cannot view your history until you approve.</p>
            </div>
          </div>
        )}
        {records.length > 0 && <p className="var-panel-help">Choose the previous services you want to share. You can revoke access at any time.</p>}
        <DetailFields items={[
          { label: 'Access', value: grant ? 'Granted' : pendingGrant ? 'Awaiting your decision' : 'No access' },
          { label: 'Ends', value: 'When this booking ends' },
        ]} />
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
                <div className="var-empty-history" role="status">
                  <strong>This vehicle has no previous completed service records yet.</strong>
                  <p>You cannot grant VAR access because there is no history to share. After a completed service is recorded, it can be shared with a workshop on a future booking.</p>
                </div>
              )}
            </fieldset>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary" type="submit" disabled={!selected.length}>
              Grant selected VAR access
            </button>
            {!records.length && pendingGrant && (
              <button className="secondary var-no-records-button" type="button"
                onClick={() => {
                  try {
                    const saved = update((current: any) => revokeHistoryAccess(current, pendingGrant.id, customerId));
                    void Promise.resolve(saved).then((ok) => notify(ok === false ? 'Could not send the response.' : 'Workshop notified that there is no earlier history to share.'))
                      .catch((reason: any) => notify(reason?.message || 'Could not send the response.'));
                  } catch (reason: any) { notify(reason?.message || 'Could not send the response.'); }
                }}>
                Notify workshop: No history available
              </button>
            )}
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
      <details ref={activityDetails} className={'fold var-customer-panel var-activity-section' + (activityAttention ? ' has-unread-attention' : '')}
        onToggle={(event) => { if (event.currentTarget.open) acknowledge('activity'); }}>
        <summary><span>Activity history</span>
          {activityAttention && <span className="var-attention-dot" aria-label="New workshop work report" title="New workshop work report"/>}
        </summary>
        <InlineWorkReport report={job.workReport} workshop={job.provider} final={job.status === 'Completed'} />
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
