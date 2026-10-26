import { useState } from 'react';
import { Siren, MapPin } from 'lucide-react';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../../components/ui/DetailChrome';
import { DetailPanel, DetailTabs } from '../../components/ui/DetailTabs';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { JobConversation } from '../../components/jobs/JobConversation';
import { customerRecords, customerNameForJob } from '../../features/admin/customerRecords';
import { merchantIdentityLabel } from '../../features/account/customerIdentity';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { vehicleCardImage } from '../../features/garage/garageSelection';
import { formatDay } from '../../features/jobs/bookingProgress';
import { pricingNote } from '../../features/jobs/pricingModel';
import { bookingReference, isAcceptedJob, isCancelledRequest, isPendingRequest, isRejectedRequest } from '../../features/jobs/jobViews';
import { activeMechanicProfessionalId } from '../../features/identity/participants';
import { unreadMessageCount } from '../../features/messages/conversation';

function VehicleArt({ image }: { image: string }) {
  if (image) return <img src={image} alt="" />;
  return (
    <svg className="garage-card-silhouette" viewBox="0 0 200 96" aria-hidden="true">
      <path d="M34 58h132c6 0 10 4 10 8v2H24v-2c0-4 4-8 10-8z" />
      <path d="M52 58 70 38c2-3 6-6 10-6h48c5 0 9 2 12 6l16 20" />
      <circle cx="68" cy="70" r="8" />
      <circle cx="138" cy="70" r="8" />
    </svg>
  );
}

export function AppointmentDetailPage({ data, job, notify, onAccept, onReject, route, section, update }: any) {
  const [tab, setTab] = useState('request');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const back = `appointments/${section}`;
  if (!job) {
    return (
      <div className="detail-page">
        <DetailBack label="Back to appointments" onClick={() => route(back)} />
        <Card as="section" className="dash-panel">
          <h1>Appointment unavailable</h1>
          <p>This request is not assigned to your workshop in this browser.</p>
        </Card>
      </div>
    );
  }
  const fits =
    section === 'rejected' ? isRejectedRequest(job) : section === 'cancelled' ? isCancelledRequest(job) : section === 'emergency' ? isPendingRequest(job) && job.kind === 'EMERGENCY' : isPendingRequest(job) && job.kind !== 'EMERGENCY';
  if (!fits) {
    const next = isAcceptedJob(job)
      ? `jobs/${encodeURIComponent(job.id)}`
      : isRejectedRequest(job)
        ? `appointments/rejected/${encodeURIComponent(job.id)}`
        : isCancelledRequest(job)
          ? `appointments/cancelled/${encodeURIComponent(job.id)}`
          : `appointments/${job.kind === 'EMERGENCY' ? 'emergency' : 'pending'}/${encodeURIComponent(job.id)}`;
    return (
      <div className="detail-page">
        <DetailBack label="Back to appointments" onClick={() => route(back)} />
        <Card as="section" className="dash-panel">
          <h1>This request has moved</h1>
          <p>It is no longer in this appointment list.</p>
          <button className="secondary" type="button" onClick={() => route(next)}>
            Open the current record
          </button>
        </Card>
      </div>
    );
  }
  const records = customerRecords(data);
  // Connected mechanic accounts are not given the admin customer directory.
  // Read contact details from the scoped booking response instead.
  const contact = records.find((item) => item.id === (job.customerId || 'cust-01'));
  const customer = job.customerName || customerNameForJob(job, records);
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const image = vehicle ? vehicleCardImage(resolveVehicleAsset(vehicle)) : '';
  const registration = vehicle?.registration || job.registration || 'Not recorded';
  const when = `${job.date ? formatDay(job.date) : 'Date not recorded'}${job.time ? ` at ${job.time}` : ''}`;
  const pending = job.status === 'Requested';
  const unread = unreadMessageCount(data, job.id, 'mechanic');
  const vehicleName = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || job.vehicleLabel || job.vehicle || 'Not recorded';

  function accept() {
    if (busy) return;
    setBusy(true);
    setError('');
    const saved = onAccept(job);
    setBusy(false);
    if (!saved) setError('Could not accept this request.');
  }

  return (
    <div className="detail-page appointment-detail">
      <DetailBack
        label={section === 'emergency' ? 'Back to emergencies' : section === 'rejected' ? 'Back to Rejected' : section === 'cancelled' ? 'Back to Cancelled' : 'Back to Pending'}
        onClick={() => route(back)}
      />
      <DetailHeader
        kicker={bookingReference(job)}
        title={job.vehicleLabel || job.vehicle || 'Appointment'}
        summary={<span>{customer}</span>}
        aside={<Status value={job.status} />}
      />
      {job.kind === 'EMERGENCY' && <div className="roadside-detail-banner"><strong><Siren size={19}/> URGENT ROADSIDE ASSISTANCE</strong><span>{job.emergencyType || 'Breakdown'} · <MapPin size={13} style={{ display: 'inline' }} /> {job.roadsideAddress || 'Location not provided'}</span><span>Confirm location, equipment and your availability with the customer in Messages before accepting.</span></div>}
      <DetailTabs
        id="mechanic-appointment"
        label="Appointment"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'request', label: 'Request details' },
          { id: 'messages', label: 'Messages', badge: unread || undefined },
        ]}
      />
      <DetailPanel scope="mechanic-appointment" tabId="request" value={tab}>
        <div className="split-detail">
          <div className="split-main">
            <DetailCard title="Customer request">
              <p>{job.description || 'No request description was saved.'}</p>
              <DetailFields
                items={[
                  { label: 'Requested', value: when },
                ]}
              />
              <p className="muted">{pricingNote(job)}</p>
              {job.rejectionReason ? <p>Rejection reason: {job.rejectionReason}</p> : null}
              {pending ? (
                <div className="decision-actions">
                  {rejecting ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (busy) return;
                        setError('');
                        setBusy(true);
                        const saved = onReject(job, reason);
                        setBusy(false);
                        if (!saved) setError('Could not reject this request. Your reason is still here.');
                      }}
                    >
                      <label>
                        Rejection reason
                        <textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={240} />
                      </label>
                      <div className="button-row">
                        <button className="secondary" type="submit" disabled={busy}>
                          Confirm rejection
                        </button>
                        <button className="text-link" type="button" onClick={() => setRejecting(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="button-row">
                      <button className="primary" type="button" disabled={busy} onClick={accept}>
                        Accept appointment
                      </button>
                      <button className="secondary" type="button" disabled={busy} aria-expanded={false} onClick={() => setRejecting(true)}>
                        Reject
                      </button>
                    </div>
                  )}
                  <p className="muted">Accepting does not approve a repair quote. Do not promise an ETA before confirming your availability.</p>
                  {error ? (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </DetailCard>
          </div>
          <div className="split-side">
            <DetailCard quiet title="Vehicle">
              <div className="vehicle-summary">
                <span className="booking-card-art">
                  <VehicleArt image={image} />
                </span>
                <div>
                  <strong>{vehicleName}</strong>
                  <DetailFields
                    items={[
                      { label: 'Registration', value: registration },
                      { label: 'Mileage', value: (vehicle?.mileage ?? job.vehicleMileage) != null
                        ? `${vehicle?.mileage ?? job.vehicleMileage} km` : 'Not recorded' },
                    ]}
                  />
                </div>
              </div>
            </DetailCard>
            <DetailCard quiet title="Customer">
              <DetailFields
                items={[
                  { label: 'Name', value: customer },
                  { label: 'Email', value: job.customerEmail || contact?.email || 'Not provided' },
                  { label: 'Phone', value: job.customerPhone || contact?.phone || 'Not provided' },
                  ...(contact?.city ? [{ label: 'City', value: contact.city }] : []),
                ]}
              />
            </DetailCard>
          </div>
        </div>
      </DetailPanel>
      <DetailPanel scope="mechanic-appointment" tabId="messages" value={tab}>
        <DetailCard title="Messages">
          <JobConversation
            active={tab === 'messages'}
            bookingId={job.id}
            data={data}
            job={job}
            notify={notify}
            update={update}
            viewerId={activeMechanicProfessionalId(data)}
            viewerName={merchantIdentityLabel(data.profile?.name)}
            viewerRole="mechanic"
          />
        </DetailCard>
      </DetailPanel>
    </div>
  );
}
