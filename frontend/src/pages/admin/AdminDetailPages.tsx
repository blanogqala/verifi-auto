import { useState } from 'react';
import { ClipboardCheck, FileText, Star, Users, Wallet, Wrench } from 'lucide-react';
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
export function ApplicationDetailPage({
  record,
  data,
  route,
  review,
  checks,
  setChecks,
  reviewNote,
  setReviewNote,
}: any) {
  const [section, setSection] = useState('Business');
  if (!record) return <Missing route={route} back="applications" />;
  const business = record.own ? data.profile : record;
  const documents = record.own ? data.documents || [] : record.documents || [];
  const history = (data.adminActivity || []).filter((e: any) => e.target === record.id);
  return (
    <div className="admin-detail-page">
      <DetailBack label="Back to applications" onClick={() => route('applications')} />
      <DetailHeader
        title={record.name}
        summary={`${record.type || 'Professional'} · ${record.city || 'Location not recorded'}`}
        aside={<StatusBadge value={record.status} />}
      />
      <Tabs items={['Business', 'Documents', 'Decision']} selected={section} select={setSection} />
      {section === 'Business' && (
        <DetailCard title="Business profile" icon={<Wrench size={20} />}>
          <DetailFields
            items={[
              { label: 'Contact person', value: business.individualName || 'Not recorded' },
              { label: 'Email', value: record.email || 'Not recorded' },
              { label: 'Telephone', value: record.phone || 'Not recorded' },
              { label: 'Submitted', value: record.date || 'Not recorded' },
              { label: 'Services', value: (business.services || []).join(' · ') || 'Not recorded' },
            ]}
          />
          <p>{business.bio || 'No business description supplied.'}</p>
          <button className="secondary" onClick={() => setSection('Documents')}>
            Review documents
          </button>
        </DetailCard>
      )}
      {section === 'Documents' && (
        <DetailCard title="Submitted evidence" icon={<FileText size={20} />}>
          {documents.length ? (
            documents.map((doc: any) => (
              <div className="document-row" key={doc.id || doc.name}>
                <FileText size={20} />
                <div>
                  <b>{doc.kind || 'Document'}</b>
                  <small>{doc.name || 'Name not recorded'}</small>
                  <small>Metadata only — file preview unavailable in this demo.</small>
                </div>
              </div>
            ))
          ) : (
            <p>No document files are available for this sample application.</p>
          )}
          <p className="muted">
            The current upload stores file metadata, not the file contents. Real document viewing
            requires secure backend storage.
          </p>
          <button className="secondary" onClick={() => setSection('Decision')}>
            Continue to decision
          </button>
        </DetailCard>
      )}
      {section === 'Decision' && (
        <DetailCard title="Verification decision" icon={<ClipboardCheck size={20} />}>
          <p className="muted">Demo review only. These checks do not verify real credentials.</p>
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
                  setChecks(
                    e.target.checked ? [...checks, c] : checks.filter((v: string) => v !== c),
                  )
                }
              />
              {c}
            </label>
          ))}
          <label className="field-label">
            Decision notes
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Explain the decision or the changes needed"
            />
          </label>
          <div className="button-row">
            <button
              className="primary"
              disabled={checks.length < 3 || record.status === 'Approved'}
              onClick={() => review(record, 'Approved')}
            >
              Approve application
            </button>
            <button className="secondary" onClick={() => review(record, 'Changes requested')}>
              Request changes
            </button>
            <button
              className="secondary"
              onClick={() =>
                review(record, record.status === 'Approved' ? 'Suspended' : 'Rejected')
              }
            >
              {record.status === 'Approved' ? 'Suspend credential' : 'Reject application'}
            </button>
          </div>
          {record.note && <p>Latest feedback: {record.note}</p>}
          {history.length > 0 && (
            <details className="fold">
              <summary>Decision history</summary>
              {history.map((e: any) => (
                <p key={e.id}>
                  {e.action} · {formatWhen(e.at)} · {e.actor}
                </p>
              ))}
            </details>
          )}
        </DetailCard>
      )}
    </div>
  );
}
export function ProfessionalAdminDetailPage({ record, data, route }: any) {
  const [section, setSection] = useState('Overview');
  if (!record) return <Missing route={route} back="professionals" />;
  const id = applicationProfessionalId(data, record);
  const profile = record.own ? data.profile : providers.find((p) => p.id === id) || record;
  const jobs = professionalJobs(data, record);
  const stats = accountMetrics(jobs);
  const rating = ratingSummary(data, id);
  const reviews = eligibleCustomerReviews(data, id);
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
                { label: 'Recorded customer payments', value: money(stats.paid) },
                {
                  label: 'Customer rating',
                  value: rating.count
                    ? `${rating.average} / 5 · ${rating.count} reviews`
                    : 'No reviews yet',
                },
              ]}
            />
            <p className="muted">
              Gross demo payments on linked jobs. This is not a bank payout or net earnings.
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
export function CustomerAdminDetailPage({ customer, data, route }: any) {
  const [section, setSection] = useState('Overview');
  if (!customer) return <Missing route={route} back="customers" />;
  const jobs = bookingsForCustomer(data.jobs, customer.id);
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
              { label: 'Recorded payments', value: money(stats.paid) },
            ]}
          />
          <p className="muted">
            Read-only demo account. Payment totals include recorded payments only.
          </p>
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
              { label: 'Payment', value: job.paid ? 'Demo payment recorded' : 'Not paid' },
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
