import { useState } from 'react';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../../components/ui/DetailChrome';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { JobConversation } from '../../components/jobs/JobConversation';
import { customerRecords, customerNameForJob } from '../../features/admin/customerRecords';
import { formatDay } from '../../features/jobs/bookingProgress';
import { bookingReference, isAcceptedJob, isCancelledRequest, isPendingRequest, isRejectedRequest } from '../../features/jobs/jobViews';
import { activeMechanicProfessionalId } from '../../features/identity/participants';
import { merchantIdentityLabel } from '../../features/account/customerIdentity';

export function AppointmentDetailPage({ data, job, notify, onAccept, onReject, route, section, update }: any) {
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
    section === 'rejected' ? isRejectedRequest(job) : section === 'cancelled' ? isCancelledRequest(job) : isPendingRequest(job);
  if (!fits) {
    const next = isAcceptedJob(job)
      ? `jobs/${encodeURIComponent(job.id)}`
      : isRejectedRequest(job)
        ? `appointments/rejected/${encodeURIComponent(job.id)}`
        : isCancelledRequest(job)
          ? `appointments/cancelled/${encodeURIComponent(job.id)}`
          : `appointments/pending/${encodeURIComponent(job.id)}`;
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
  const customer = customerNameForJob(job, customerRecords(data));
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const registration = vehicle?.registration || job.registration || 'Not recorded';
  const pending = job.status === 'Requested';

  return (
    <div className="detail-page">
      <DetailBack
        label={section === 'rejected' ? 'Back to Rejected' : section === 'cancelled' ? 'Back to Cancelled' : 'Back to Pending'}
        onClick={() => route(back)}
      />
      <DetailHeader
        kicker={bookingReference(job)}
        title={job.vehicleLabel || job.vehicle || 'Appointment'}
        summary={
          <span>
            {customer}
            {' · '}
            {job.date ? formatDay(job.date) : 'Date not recorded'}
            {job.time ? ` at ${job.time}` : ''}
          </span>
        }
        aside={<Status value={job.status} />}
      />
      <DetailCard title="Request">
        <p>{job.description || 'No request description was saved.'}</p>
        <p className="muted">Assessment fee R{Number(job.fee || 0).toLocaleString()}. Accepting does not approve a repair quote.</p>
        <DetailFields
          items={[
            { label: 'Customer', value: customer },
            { label: 'Vehicle', value: job.vehicleLabel || job.vehicle || 'Not recorded' },
            { label: 'Registration', value: registration },
            { label: 'Requested', value: `${job.date ? formatDay(job.date) : 'Date not recorded'}${job.time ? ` at ${job.time}` : ''}` },
            { label: 'Assessment fee', value: `R${Number(job.fee || 0).toLocaleString()}` },
          ]}
        />
        {job.rejectionReason ? <p>Rejection reason: {job.rejectionReason}</p> : null}
        {pending ? (
          <div className="button-row">
            <button
              className="primary"
              type="button"
              disabled={busy}
              onClick={() => {
                if (busy) return;
                setBusy(true);
                const saved = onAccept(job);
                setBusy(false);
                if (!saved) setError('Could not accept this request.');
              }}
            >
              Accept
            </button>
          </div>
        ) : null}
        {pending ? (
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
            <button className="secondary" type="submit" disabled={busy}>
              Reject
            </button>
          </form>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </DetailCard>
      <DetailCard title="Messages">
        <JobConversation
          active
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
    </div>
  );
}
