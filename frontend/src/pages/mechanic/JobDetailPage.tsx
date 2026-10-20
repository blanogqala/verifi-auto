import { useEffect, useState } from 'react';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../../components/ui/DetailChrome';
import { DetailPanel, DetailTabs } from '../../components/ui/DetailTabs';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { BookingProgress } from '../../components/jobs/BookingProgress';
import { JobConversation } from '../../components/jobs/JobConversation';
import { QuoteEditor } from '../../components/jobs/QuoteEditor';
import { QuoteSummary } from '../../components/jobs/QuoteSummary';
import { merchantIdentityLabel } from '../../features/account/customerIdentity';
import { customerNameForJob, customerRecords } from '../../features/admin/customerRecords';
import { formatDay, formatWhen } from '../../features/jobs/bookingProgress';
import { bookingReference } from '../../features/jobs/jobViews';
import { quoteEditable } from '../../features/jobs/quotations';
import { pricingNote } from '../../features/jobs/pricingModel';
import { sharedRecordsForProfessional } from '../../features/garage/historyAccess';
import { activeMechanicProfessionalId } from '../../features/identity/participants';
import { unreadMessageCount } from '../../features/messages/conversation';

export function JobDetailPage({ data, go, job, notify, onAction, panel, route, update }: any) {
  const [tab, setTab] = useState(panel || 'overview');
  const [notes, setNotes] = useState('');
  const [mileage, setMileage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bookingId = job?.id || '';
  useEffect(() => {
    setTab(panel || 'overview');
  }, [bookingId, panel]);
  useEffect(() => {
    setNotes('');
    setMileage('');
    setError('');
    setBusy(false);
  }, [bookingId]);
  if (!job) {
    return (
      <div className="detail-page">
        <DetailBack label="Back to Jobs" onClick={() => route('jobs')} />
        <Card as="section" className="dash-panel">
          <h1>Job unavailable</h1>
          <p>This job is not assigned to your workshop in this browser.</p>
        </Card>
      </div>
    );
  }
  const professionalId = activeMechanicProfessionalId(data);
  const customer = customerNameForJob(job, customerRecords(data));
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const registration = vehicle?.registration || job.registration || 'Not recorded';
  const history = sharedRecordsForProfessional(data, job, professionalId);
  const events = Array.isArray(job.events) ? job.events : [];
  const unread = unreadMessageCount(data, job.id, 'mechanic');
  const editable = !job.paid && (job.status !== 'Approved' || !!job.customerRequest) && quoteEditable(job.status);

  function choose(next: string) {
    setTab(next);
    route(next === 'overview' ? `jobs/${encodeURIComponent(job.id)}` : `jobs/${encodeURIComponent(job.id)}/${next}`);
  }
  function run(action: string, extra: any = {}) {
    if (busy) return false;
    setBusy(true);
    setError('');
    const saved = onAction(job, action, extra);
    setBusy(false);
    if (!saved) setError('Could not save this change.');
    return !!saved;
  }

  return (
    <div className="detail-page mechanic-job-detail">
      <DetailBack label="Back to Jobs" onClick={() => go('dashboard/jobs')} />
      <DetailHeader
        kicker={bookingReference(job)}
        title={job.vehicleLabel || job.vehicle || 'Job'}
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
      <DetailCard title="Progress">
        <BookingProgress job={job} />
      </DetailCard>
      <DetailTabs
        id="mechanic-job"
        label="Job details"
        value={tab}
        onChange={choose}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'quote', label: 'Quote & payment' },
          { id: 'messages', label: 'Messages', badge: unread || undefined },
        ]}
      />
      <DetailPanel scope="mechanic-job" tabId="overview" value={tab}>
        <div className="split-detail">
          <div className="split-main">
            <DetailCard title="Customer request">
              <p>{job.description || 'No request description was saved.'}</p>
              <DetailFields
                items={[
                  { label: 'Requested', value: `${job.date ? formatDay(job.date) : 'Date not recorded'}${job.time ? ` at ${job.time}` : ''}` },
                ]}
              />
              <p className="muted">{pricingNote(job)}</p>
              {job.status === 'Confirmed' ? (
                <button className="primary" type="button" onClick={() => choose('quote')}>
                  Prepare quotation
                </button>
              ) : null}
              {job.status === 'Awaiting approval' ? <p>Quotation sent. Waiting for the customer.</p> : null}
              {job.status === 'Changes requested' ? (
                <>
                  <p>Change request: {job.changeRequest || 'The customer asked for a revision.'}</p>
                  <button className="primary" type="button" onClick={() => choose('quote')}>
                    Revise quotation
                  </button>
                </>
              ) : null}
              {job.status === 'Approved' ? (
                <button className="primary" type="button" disabled={busy} onClick={() => run('start')}>
                  Start work
                </button>
              ) : null}
              {job.status === 'In progress' ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const saved = run('complete', { completionNotes: notes, completedMileage: mileage });
                    if (!saved) setError('Could not record the completed work. Your notes are still here.');
                  }}
                >
                  <label>
                    Completed work
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} required />
                  </label>
                  <label>
                    Mileage (km)
                    <input inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value)} required />
                  </label>
                  <button className="primary" type="submit" disabled={busy}>
                    Mark work finished
                  </button>
                </form>
              ) : null}
              {job.status === 'Awaiting payment' ? (
                <>
                  <p>The invoice is unpaid.</p>
                  <button className="secondary" type="button" onClick={() => choose('quote')}>
                    View quotation
                  </button>
                </>
              ) : null}
              {job.completionNotes ? <p>Completed work: {job.completionNotes}</p> : null}
              {job.paid ? (
                <p>
                  Demo payment recorded
                  {job.paymentReference ? ` · ${job.paymentReference}` : ''}
                  {job.paidAt ? ` · ${formatWhen(job.paidAt)}` : ''}
                </p>
              ) : null}
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </DetailCard>
            <details className="fold">
              <summary>Activity history</summary>
              {events.length ? (
                <ol className="activity-list">
                  {events.map((event: any) => (
                    <li key={(event.at || '') + event.type}>
                      <time dateTime={event.at}>{formatWhen(event.at) || 'Time not recorded'}</time>
                      <span>{event.label || event.type}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No dated activity was stored for this job.</p>
              )}
            </details>
          </div>
          <div className="split-side">
            <DetailCard quiet title="Booking">
              <DetailFields
                items={[
                  { label: 'Customer', value: customer },
                  { label: 'Vehicle', value: job.vehicleLabel || job.vehicle || 'Not recorded' },
                  { label: 'Registration', value: registration },
                  { label: 'Mileage', value: vehicle?.mileage ? `${vehicle.mileage} km` : 'Not recorded' },
                ]}
              />
            </DetailCard>
            {history.length ? (
              <DetailCard quiet title="Service history">
                {history.map((record: any) => (
                  <p key={record.id}>
                    {record.title || 'Service record'}
                    {record.date ? ` · ${formatDay(record.date)}` : ''}
                  </p>
                ))}
              </DetailCard>
            ) : (
              <p className="muted">No service history has been shared for this booking.</p>
            )}
          </div>
        </div>
      </DetailPanel>
      <DetailPanel scope="mechanic-job" tabId="quote" value={tab}>
        <DetailCard title="Quote & payment">
          {editable ? (
            <>
              <h3>Draft</h3>
              <QuoteEditor
                key={job.id}
                actor={{ role: 'mechanic', id: professionalId }}
                job={job}
                notify={notify}
                onSent={() => choose('quote')}
                update={update}
              />
            </>
          ) : null}
          {job.status === 'Approved' ? <p>Only selected repairs are authorised. Any revision before payment requires fresh customer approval.</p> : null}
          {job.status === 'Awaiting payment' ? <p>Unpaid invoice. You cannot mark this invoice paid.</p> : null}
          <QuoteSummary job={job} title={job.items?.length ? 'Sent quotation' : 'Sent quotation'} />
          <p className="muted">{pricingNote(job)}</p>
        </DetailCard>
      </DetailPanel>
      <DetailPanel scope="mechanic-job" tabId="messages" value={tab}>
        <DetailCard title="Messages">
          <JobConversation
            active={tab === 'messages'}
            bookingId={job.id}
            data={data}
            job={job}
            notify={notify}
            update={update}
            viewerId={professionalId}
            viewerName={merchantIdentityLabel(data.profile?.name)}
            viewerRole="mechanic"
          />
        </DetailCard>
      </DetailPanel>
    </div>
  );
}
