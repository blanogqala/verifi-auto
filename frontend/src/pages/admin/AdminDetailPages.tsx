import { allApprovedQuotesPaid } from '../../features/jobs/bookingQuotes';
import { useState } from 'react';
import { ClipboardCheck, FileText, Star, Users, Wallet, Wrench, Eye, CheckCircle2, Trash2 } from 'lucide-react';
import {
  DetailBack,
  DetailHeader,
  DetailCard,
  DetailFields,
} from '../../components/ui/DetailChrome';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BookingProgress } from '../../components/jobs/BookingProgress';
import { QuoteSummary } from '../../components/jobs/QuoteSummary';
import {
  applicationProfessionalId,
  professionalJobs,
  accountMetrics,
} from '../../features/admin/detailRecords';
import { bookingsForCustomer } from '../../features/admin/customerRecords';
import { money } from '../../features/admin/paymentRecords';
import { bookingReference } from '../../features/jobs/jobViews';
import { formatWhen } from '../../features/jobs/bookingProgress';
import { eligibleCustomerReviews, ratingSummary } from '../../features/reviews/ratingSummary';
import { providers } from '../../data/professionals';

function Tabs({ items, selected, select }: any) {
  return (
    <div className="profile-tablist admin-detail-tabs" aria-label="Record sections">
      {items.map((item: string) => (
        <button
          type="button"
          key={item}
          className={selected === item ? 'selected' : ''}
          aria-pressed={selected === item}
          onClick={() => select(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
function Missing({ route, back }: any) {
  return (
    <>
      <DetailBack label="Back to list" onClick={() => route(back)} />
      <DetailCard title="Record not found">
        <p>This record is no longer available. Return to the list to choose another.</p>
      </DetailCard>
    </>
  );
}
export function AdminJobsList({ jobs, route }: any) {
  return jobs.length ? (
    <div className="admin-record-list">
      {jobs.map((job: any) => (
        <button
          className="admin-record-link"
          type="button"
          key={job.id}
          onClick={() => route('jobs/' + encodeURIComponent(job.id))}
        >
          <span>
            <b>{job.vehicle || 'Vehicle not recorded'}</b>
            <small>
              {bookingReference(job)} · {job.provider || 'Professional not recorded'}
            </small>
          </span>
          <StatusBadge value={job.status} />
        </button>
      ))}
    </div>
  ) : (
    <p className="muted">No linked bookings yet.</p>
  );
}
function Metrics({ jobs }: any) {
  const stats = accountMetrics(jobs);
  return (
    <div className="admin-record-metrics">
      {[
        ['Bookings', stats.total],
        ['Completed', stats.completed],
        ['Active', stats.active],
        ['Cancelled / rejected', stats.stopped],
      ].map(([label, value]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export function ApplicationDetailPage({ record, data, route, review, reviewNote, setReviewNote, connected }: any) {
  const [pendingDocument, setPendingDocument] = useState('');
  const [documentError, setDocumentError] = useState('');
  if (!record) return <Missing route={route} back="applications" />;
  const business = record.own ? data.profile : record;
  const documents = record.own ? data.documents || [] : record.documents || [];
  const history = (data.adminActivity || []).filter((entry: any) => entry.target === record.id);
  const inReview = record.status === 'Pending review';
  const approvedKind = (kind: string) => [...documents]
    .sort((left: any, right: any) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .find((doc: any) => doc.kind === kind)?.reviewStatus === 'APPROVED';
  const evidenceApproved = approvedKind('Identity evidence') &&
    approvedKind('Qualifications / experience');

  async function documentAction(doc: any, action: 'APPROVED' | 'DELETE') {
    if (!connected || pendingDocument) return;
    setDocumentError('');
    if (action === 'DELETE') {
      if (reviewNote.trim().length < 3) {
        setDocumentError('Add a reason in the decision note before removing evidence.');
        return;
      }
      if (!window.confirm('Remove this evidence? The mechanic will be asked to upload a replacement.')) return;
    }
    setPendingDocument(doc.id);
    try {
      if (action === 'DELETE') await connected.removeDocument(doc.id, reviewNote.trim());
      else await connected.reviewDocument(doc.id, doc.reviewStatus || 'PENDING');
    } catch (error: any) {
      setDocumentError(error?.message || 'Could not update this document.');
    } finally {
      setPendingDocument('');
    }
  }
  return (
    <div className="admin-detail-page application-review-page">
      <DetailBack label="Back to applications" onClick={() => route('applications')} />
      <DetailHeader
        title={record.name}
        summary={`${record.type || 'Professional'} · ${record.city || 'Location not recorded'}`}
        aside={<StatusBadge value={record.status} />}
      />
      <DetailCard title="Business details" icon={<Wrench size={20} />}>
        <DetailFields items={[
          { label: 'Business name', value: business.name || 'Not recorded' },
          { label: 'Contact person', value: business.individualName || record.name || 'Not recorded' },
          { label: 'Email', value: record.email || 'Not recorded' },
          { label: 'Telephone', value: record.phone || 'Not recorded' },
          { label: record.status === 'Incomplete' ? 'Registered' : 'Submitted', value: record.date || 'Not recorded' },
          ...(connected ? [{ label: 'Email verification', value: record.emailVerified ? 'Verified' : 'Not verified' }] : []),
          { label: 'Business address', value: business.address || 'Not recorded' },
          { label: 'Service areas', value: (business.serviceAreas?.length ? business.serviceAreas : [business.city]).filter(Boolean).join(' · ') || 'Not recorded' },
          { label: 'Services offered', value: (business.services || []).join(' · ') || 'Not recorded' },
        ]} />
        <p>{business.bio || 'No business description supplied.'}</p>
      </DetailCard>
      <DetailCard title="Submitted documents" icon={<FileText size={20} />}>
        {documents.length ? documents.map((doc: any) => (
          <div className="document-row" key={doc.id || doc.name}>
            <FileText size={20} aria-hidden="true" />
            <div>
              <b>{doc.kind || 'Document'}</b>
              <small>{doc.name || 'Not recorded'}</small>
              {connected && <small>Review: {doc.reviewStatus === 'APPROVED' ? 'Approved' : doc.reviewStatus === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Awaiting review'}</small>}
              {doc.reviewNote && <small>Note: {doc.reviewNote}</small>}
            </div>
            {connected ? (
              <div className="evidence-actions">
                <a className="icon-action" title="View document" aria-label={`View ${doc.kind}`}
                  href={connected.previewUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                  <Eye size={17} />
                </a>
                {inReview && (
                  <>
                    <button type="button" className="icon-action" title={`Approve ${doc.kind}`}
                      aria-label={`Approve ${doc.kind}`}
                      disabled={!!pendingDocument || doc.reviewStatus === 'APPROVED'}
                      onClick={() => void documentAction(doc, 'APPROVED')}>
                      <CheckCircle2 size={17} />
                    </button>
                    <button type="button" className="icon-action" title={`Delete ${doc.kind}`}
                      aria-label={`Delete ${doc.kind}`}
                      disabled={!!pendingDocument}
                      onClick={() => void documentAction(doc, 'DELETE')}>
                      <Trash2 size={17} />
                    </button>
                  </>
                )}
              </div>
            ) : <small>Demo metadata only — no real file uploaded.</small>}
          </div>
        )) : <p className="muted">No documents uploaded yet.</p>}
        <p className="muted">
          {connected
            ? 'View private evidence, approve individual documents, or request a corrected upload. Only administrators and the owner can access these files.'
            : 'This preview does not store real document contents.'}
        </p>
        {documentError && <p className="form-error" role="alert">{documentError}</p>}
      </DetailCard>
      <DetailCard title="Application decision" icon={<ClipboardCheck size={20} />}>
        {connected && !inReview && (
          <p className="notice">
            {record.status === 'Incomplete'
              ? 'This mechanic has not submitted the application yet.'
              : 'This application cannot be approved until it is resubmitted.'}
          </p>
        )}
        {connected && inReview && !evidenceApproved && (
          <p className="notice">
            Approve identity evidence and qualifications/experience before approving this application.
          </p>
        )}
        <label className="field-label">
          Decision note
          <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)}
            placeholder="Explain required corrections. A reason is required when requesting changes or deleting evidence." />
        </label>
        <div className="button-row">
          <button type="button" className="primary"
            disabled={connected ? !inReview || !evidenceApproved : record.status === 'Approved'}
            onClick={() => review(record, 'Approved')}>
            Approve application
          </button>
          <button type="button" className="secondary"
            disabled={Boolean(connected) && (!inReview || reviewNote.trim().length < 3)}
            onClick={() => review(record, 'Changes requested')}>
            Request changes
          </button>
          {(!connected || record.status === 'Approved') && (
            <button type="button" className="secondary"
              onClick={() => review(record, record.status === 'Approved' ? 'Suspended' : 'Rejected')}>
              {record.status === 'Approved' ? 'Suspend credential' : 'Reject application'}
            </button>
          )}
        </div>
        <p className="muted">The mechanic sees your decision and feedback in Verification status.</p>
        {record.note && <p>Latest feedback: {record.note}</p>}
        {history.length > 0 && (
          <details className="fold">
            <summary>Review activity</summary>
            {history.map((event: any) => (
              <p key={event.id}>{event.action} · {formatWhen(event.at)} · {event.actor}</p>
            ))}
          </details>
        )}
      </DetailCard>
    </div>
  );
}
export function ProfessionalAdminDetailPage({ record, data, route, connected }: any) {
  const [section, setSection] = useState('Overview');
  if (!record) return <Missing route={route} back="professionals" />;
  const id = applicationProfessionalId(data, record);
  const profile = connected
    ? record
    : record.own
      ? data.profile
      : providers.find((p) => p.id === id) || record;
  const jobs = connected ? connected.jobs : professionalJobs(data, record);
  const stats = accountMetrics(jobs);
  const rating = connected ? connected.rating : ratingSummary(data, id);
  const reviews = connected ? connected.reviews : eligibleCustomerReviews(data, id);
  return (
    <div className="admin-detail-page">
      <DetailBack label="Back to professionals" onClick={() => route('professionals')} />
      <DetailHeader
        title={record.name}
        summary={`${record.type} · ${record.city}`}
        aside={<StatusBadge value={record.status} />}
      />
      <Metrics jobs={jobs} />
      <Tabs items={['Overview', 'Jobs', 'Reviews']} selected={section} select={setSection} />
      {section === 'Overview' && (
        <div className="admin-detail-grid">
          <DetailCard title="Professional profile" icon={<Wrench size={20} />}>
            <DetailFields
              items={[
                { label: 'Email', value: record.email || profile.email || 'Not recorded' },
                { label: 'Telephone', value: record.phone || profile.phone || 'Not recorded' },
                {
                  label: 'Services',
                  value: (profile.services || []).join(' · ') || 'Not recorded',
                },
              ]}
            />
            <p>{profile.bio || 'No description supplied.'}</p>
            <button
              className="secondary"
              onClick={() => route('applications/' + encodeURIComponent(record.id))}
            >
              View verification record
            </button>
          </DetailCard>
          <DetailCard title="Platform activity" icon={<Wallet size={20} />}>
            <DetailFields
              items={[
                {
                  label: 'Recorded customer payments',
                  value: money(connected ? connected.paid : stats.paid),
                },
                {
                  label: 'Customer rating',
                  value: rating.count
                    ? `${rating.average} / 5 · ${rating.count} reviews`
                    : 'No reviews yet',
                },
              ]}
            />
            <p className="muted">
              {connected
                ? 'Confirmed gross payments on recent linked jobs. This is not a bank payout or net earnings.'
                : 'Gross demo payments on linked jobs. This is not a bank payout or net earnings.'}
            </p>
          </DetailCard>
        </div>
      )}
      {section === 'Jobs' && (
        <DetailCard title="Booking history">
          <AdminJobsList jobs={jobs} route={route} />
        </DetailCard>
      )}
      {section === 'Reviews' && (
        <DetailCard title="Customer reviews" icon={<Star size={20} />}>
          {reviews.length ? (
            reviews.map((r: any) => (
              <article className="admin-review" key={r.id}>
                <b>{r.rating} / 5</b>
                <p>{r.text}</p>
                <small>{r.createdAt ? formatWhen(r.createdAt) : 'Date not recorded'}</small>
              </article>
            ))
          ) : (
            <p>No customer reviews yet.</p>
          )}
        </DetailCard>
      )}
    </div>
  );
}
export function CustomerAdminDetailPage({ customer, data, route, connected }: any) {
  const [section, setSection] = useState('Overview');
  if (!customer) return <Missing route={route} back="customers" />;
  const jobs = connected ? connected.jobs : bookingsForCustomer(data.jobs, customer.id);
  const stats = accountMetrics(jobs);
  return (
    <div className="admin-detail-page">
      <DetailBack label="Back to customers" onClick={() => route('customers')} />
      <DetailHeader
        title={customer.name || 'Customer'}
        summary={customer.city || 'Location not recorded'}
      />
      <Metrics jobs={jobs} />
      <Tabs items={['Overview', 'Bookings']} selected={section} select={setSection} />
      {section === 'Overview' ? (
        <DetailCard title="Customer account" icon={<Users size={20} />}>
          <DetailFields
            items={[
              { label: 'Email', value: customer.email || 'Not recorded' },
              { label: 'Telephone', value: customer.phone || 'Not recorded' },
              { label: 'Customer ID', value: customer.id },
              { label: 'Recorded payments', value: money(connected ? connected.paid : stats.paid) },
            ]}
          />
          <p className="muted">
            {connected
              ? 'Payment totals include confirmed payments on recent linked bookings only.'
              : 'Read-only demo account. Payment totals include recorded payments only.'}
          </p>
          {connected?.accountAction}
        </DetailCard>
      ) : (
        <DetailCard title="Customer bookings">
          <AdminJobsList jobs={jobs} route={route} />
        </DetailCard>
      )}
    </div>
  );
}
export function AdminJobDetailPage({ job, data, route }: any) {
  const [section, setSection] = useState('Overview');
  if (!job) return <Missing route={route} back="jobs" />;
  const customer = (data.customers || []).find((c: any) => c.id === job.customerId);
  return (
    <div className="admin-detail-page">
      <DetailBack label="Back to jobs & activity" onClick={() => route('jobs')} />
      <DetailHeader
        title={job.vehicle || 'Job details'}
        summary={bookingReference(job)}
        aside={<StatusBadge value={job.status} />}
      />
      <DetailCard title="Job progress">
        <BookingProgress job={job} />
      </DetailCard>
      <Tabs items={['Overview', 'Quotation', 'Activity']} selected={section} select={setSection} />
      {section === 'Overview' && (
        <DetailCard title="Booking details">
          <DetailFields
            items={[
              { label: 'Customer', value: customer?.name || 'Not recorded' },
              { label: 'Professional', value: job.provider || 'Not recorded' },
              {
                label: 'Appointment',
                value: [job.date, job.time].filter(Boolean).join(' · ') || 'Not recorded',
              },
              { label: 'Vehicle ID', value: job.vehicleId || 'Not linked' },
              {
                label: 'Payment',
                value:
                  job.quoteApproved && allApprovedQuotesPaid(job)
                    ? 'Approved quotes paid (demo)'
                    : 'Not fully paid',
              },
            ]}
          />
          <p>{job.description || 'No description supplied.'}</p>
          {job.completionNotes && <p>Work performed: {job.completionNotes}</p>}
          {job.rejectionReason && <p>Rejection reason: {job.rejectionReason}</p>}
        </DetailCard>
      )}
      {section === 'Quotation' && (
        <DetailCard title="Submitted quotation">
          <QuoteSummary job={job} />
          <p className="muted">
            Read-only. Customer approvals and mechanic workflow remain with their respective
            accounts.
          </p>
        </DetailCard>
      )}
      {section === 'Activity' && (
        <DetailCard title="Job activity">
          {job.events?.length ? (
            <ol className="activity-list">
              {job.events.map((e: any, i: number) => (
                <li key={e.id || i}>
                  <b>{e.label || e.type || e.action || e.status || 'Job update'}</b>
                  <span>{e.at ? formatWhen(e.at) : 'Date not recorded'}</span>
                  {e.note && <span>{e.note}</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p>No recorded events for this job.</p>
          )}
        </DetailCard>
      )}
    </div>
  );
}
