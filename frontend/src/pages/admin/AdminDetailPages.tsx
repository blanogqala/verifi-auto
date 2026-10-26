import { allApprovedQuotesPaid } from '../../features/jobs/bookingQuotes';
import { useEffect, useState } from 'react';
import { CalendarDays, CarFront, ClipboardCheck, FileText, Star, Users, Wallet, Wrench, Eye, CheckCircle2, Trash2, Ban, Mail, Phone, ShieldCheck, Clock3, ArrowUpRight, Globe2 } from 'lucide-react';
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
import { api, apiBase } from '../../data-access/api';

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
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(connected));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [revision, setRevision] = useState(0);
  const id = record?.id || '';
  const live = Boolean(connected);

  useEffect(() => {
    if (!live || !id) { setDetail(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError('');
    api('/admin/professionals/' + encodeURIComponent(id))
      .then((row) => { if (active) setDetail(row); })
      .catch((reason: any) => { if (active) {
        setDetail(null);
        setError(reason?.message || 'Could not load professional details.');
      } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [live, id, revision]);

  if (!record) return <Missing route={route} back="professionals" />;
  if (loading && !detail) return (
    <div className="admin-detail-page">
      <DetailBack label="Back to professionals" onClick={() => route('professionals')} />
      <p role="status">Loading professional profile, verification evidence and jobs…</p>
    </div>
  );
  if (live && error && !detail) return (
    <div className="admin-detail-page">
      <DetailBack label="Back to professionals" onClick={() => route('professionals')} />
      <DetailCard title="Professional information unavailable">
        <p role="alert">{error}</p>
        <button type="button" className="secondary" onClick={() => setRevision(v => v + 1)}>Try again</button>
      </DetailCard>
    </div>
  );
  const profile = live ? detail : record.own ? data.profile :
    providers.find((p) => p.id === applicationProfessionalId(data, record)) || record;
  const owner = live ? detail?.user || {} : record;
  const disabled = Boolean(owner.disabledAt || record.accountDisabled);
  const displayStatus = disabled ? 'Blocked' : live ?
    String(profile.status === 'APPROVED' ? 'Approved' : profile.status === 'SUSPENDED' ? 'Suspended' : profile.status || 'Not recorded') :
    record.status;
  const jobs = live ? (detail?.recentBookings || []) : professionalJobs(data, record);
  const fallbackStats = accountMetrics(jobs);
  const total = live ? detail?.bookingTotal || 0 : fallbackStats.total;
  const active = live ? detail?.bookingCounts?.active || 0 : fallbackStats.active;
  const completed = live ? detail?.bookingCounts?.completed || 0 : fallbackStats.completed;
  const revenueCents = live ? detail?.recordedGrossRevenueCents || 0 : Math.round(fallbackStats.paid * 100);
  const reviews = live ? profile.reviews || [] : eligibleCustomerReviews(data, applicationProfessionalId(data, record));
  const average = reviews.length ? (reviews.reduce((sum: number, review: any) =>
    sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : '';
  const documents = live ? owner.documents || [] : record.documents || [];
  const name = profile.name || record.name || 'Professional';
  const photo = live ? owner.photo || '' : profile.photo || '';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0] || '').join('').toUpperCase();

  async function toggleBlock() {
    if (!live || busy || !owner.id) return;
    if (!disabled && !window.confirm(
      'Block this professional? Their account will be signed out and removed from customer discovery until unblocked.',
    )) return;
    setBusy(true); setError('');
    try {
      await api('/admin/users/' + encodeURIComponent(owner.id) + '/status', 'POST', { disabled: !disabled });
      setRevision(v => v + 1);
      connected?.refresh?.();
    } catch (reason: any) { setError(reason?.message || 'Could not change account status.'); }
    finally { setBusy(false); }
  }
  async function deleteProfessional() {
    if (!live || busy || confirmName !== name) return;
    setBusy(true); setError('');
    try {
      await api('/admin/professionals/' + encodeURIComponent(id), 'DELETE', {});
      connected?.refresh?.();
      route('professionals');
    } catch (reason: any) { setError(reason?.message || 'This professional could not be deleted.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-detail-page admin-professional-detail">
      <DetailBack label="Back to professionals" onClick={() => route('professionals')} />
      <section className="admin-customer-hero" aria-label="Professional account summary">
        <div className="admin-customer-identity">
          <div className="admin-customer-avatar admin-professional-avatar" aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : initials}
          </div>
          <div className="admin-customer-identity-copy">
            <div className="admin-customer-name-row">
              <h1>{name}</h1>
              <span className={'admin-customer-state' + (disabled ? ' blocked' : '')}>{displayStatus}</span>
            </div>
            <p className="muted">
              {profile.type || 'Professional'} · {profile.city || 'Location not recorded'}
              {owner.createdAt ? ' · Registered ' + customerDate(owner.createdAt) : ''}
            </p>
            <div className="admin-customer-contact">
              <span><Mail size={15} aria-hidden="true" />{owner.email || record.email || 'Email not recorded'}</span>
              <span><Phone size={15} aria-hidden="true" />{profile.phone || 'Phone not recorded'}</span>
              <span><ShieldCheck size={15} aria-hidden="true" />
                {profile.credentialId || 'Credential not recorded'}</span>
              {profile.address ? <span><CarFront size={15} aria-hidden="true" />{profile.address}</span> : null}
              {profile.website ? <span><Globe2 size={15} aria-hidden="true" />{profile.website}</span> : null}
            </div>
          </div>
        </div>
        {live && <div className="admin-customer-actions">
          <button type="button" className="secondary" disabled={busy}
            onClick={() => void toggleBlock()}>
            {disabled ? <ShieldCheck size={16} /> : <Ban size={16} />}
            {disabled ? 'Unblock professional' : 'Block professional'}
          </button>
          <button type="button" className="secondary admin-delete-trigger" disabled={busy}
            onClick={() => { setShowDelete(v => !v); setConfirmName(''); }}>
            <Trash2 size={16} /> Delete professional
          </button>
        </div>}
      </section>
      {live && showDelete && <section className="admin-customer-delete-confirm" aria-label="Confirm professional deletion">
        <strong>Confirm permanent professional account deletion</strong>
        <p>This is only available when no bookings, verification documents, reviews or other service
          history exist. For verified businesses with records, block the account instead.
          Type the exact business name to confirm.</p>
        <div className="admin-customer-confirm-controls">
          <input type="text" aria-label="Confirm business name" autoComplete="off"
            value={confirmName} onChange={event => setConfirmName(event.target.value)} />
          <button type="button" disabled={busy || confirmName !== name}
            onClick={() => void deleteProfessional()}>Permanently delete</button>
          <button type="button" className="secondary" onClick={() => setShowDelete(false)}>Cancel</button>
        </div>
      </section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-professional-metrics" aria-label="Professional booking and revenue statistics">
        <div><strong>{total}</strong><span>Total bookings</span></div>
        <div><strong>{active} / {completed}</strong><span>Active / Completed jobs</span></div>
        <div><strong>{zar(revenueCents)}</strong><span>Recorded gross revenue</span></div>
      </div>
      <p className="muted admin-professional-revenue-note">
        Gross confirmed customer payments (excluding test payments). Not the mechanic's net earnings
        or payout balance; live payouts are not connected yet.
      </p>
      <Tabs items={['Overview', 'Jobs', 'Reviews']} selected={section} select={setSection} />
      {section === 'Overview' && <div className="admin-professional-overview-grid">
        <DetailCard title="Verification documents" icon={<FileText size={20} />}>
          {documents.length ? documents.map((doc: any) => (
            <div className="document-row" key={doc.id || doc.name}>
              <FileText size={20} aria-hidden="true" />
              <div>
                <b>{doc.kind === 'IDENTITY' ? 'Identity evidence' :
                  doc.kind === 'QUALIFICATION' ? 'Qualifications / experience' :
                  doc.kind === 'BUSINESS' ? 'Business registration' : doc.kind || 'Document'}</b>
                <small>{doc.name || 'Document name not recorded'}</small>
                <small>Review: {doc.reviewStatus === 'APPROVED' ? 'Approved' :
                  doc.reviewStatus === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Pending review'}</small>
                {doc.reviewNote && <small>Review note: {doc.reviewNote}</small>}
              </div>
              {live ? <a className="icon-action" href={`${apiBase}/api/documents/${encodeURIComponent(doc.id)}/preview`}
                aria-label={'View ' + (doc.kind || 'document')} title="View private document"
                target="_blank" rel="noopener noreferrer">
                <Eye size={17} />
              </a> : <small>Demo metadata only</small>}
            </div>
          )) : <p className="muted">No verification documents recorded.</p>}
          <p className="muted">Documents are private and only accessible to authorised reviewers
            and the account owner. This screen is read-only after approval.</p>
        </DetailCard>
        <DetailCard title="Customer feedback and activity" icon={<Star size={20} />}>
          <DetailFields items={[
            { label: 'Customer rating (recent reviews)', value: reviews.length ?
              average + ' / 5 · ' + reviews.length + ' shown' : 'No reviews yet' },
            { label: 'Cancelled / rejected bookings',
              value: live ? detail?.bookingCounts?.stopped || 0 : fallbackStats.stopped },
            { label: 'Verification status', value: displayStatus },
          ]} />
          <p className="muted">Jobs and customer reviews have their own sections above.
            This activity summary is for oversight, not a bank payout statement.</p>
        </DetailCard>
      </div>}
      {section === 'Jobs' && <DetailCard title={`Booking history (${total})`}>
        {jobs.length ? <div className="admin-customer-booking-list">
          {jobs.map((job: any) => (
            <article className="admin-customer-booking" key={job.id}>
              <div className="admin-customer-booking-main">
                <strong>{live
                  ? [job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') || 'Vehicle not recorded'
                  : job.vehicle || 'Vehicle not recorded'}</strong>
                <span>{customerDate(job.appointmentAt || job.createdAt || job.date)}</span>
                {job.description && <p>{job.description}</p>}
              </div>
              <div className="admin-customer-booking-side">
                <StatusBadge value={customerBookingStatus[job.status] || job.status} />
                {(data.jobs || []).some((x: any) => x.id === job.id) &&
                  <button type="button" className="text-link"
                    onClick={() => route('jobs/' + encodeURIComponent(job.id))}>
                    View job <ArrowUpRight size={14} />
                  </button>}
              </div>
            </article>
          ))}
        </div> : <p className="muted">No linked bookings yet.</p>}
        {live && total > jobs.length &&
          <p className="muted">Showing the latest {jobs.length} of {total} bookings.</p>}
      </DetailCard>}
      {section === 'Reviews' && <DetailCard title="Customer reviews" icon={<Star size={20} />}>
        {reviews.length ? reviews.map((review: any) =>
          <article className="admin-review" key={review.id}>
            <b>{review.rating} / 5</b>
            <p>{review.body || review.text || 'No written review.'}</p>
            <small>{review.createdAt ? formatWhen(review.createdAt) : 'Date not recorded'}</small>
          </article>,
        ) : <p>No customer reviews yet.</p>}
      </DetailCard>}
    </div>
  );
}
const customerBookingStatus: Record<string, string> = {
  REQUESTED: 'Requested', CONFIRMED: 'Confirmed', APPROVED: 'Approved',
  IN_PROGRESS: 'In progress', AWAITING_PAYMENT: 'Awaiting payment',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected',
};
function customerDate(value: any) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' :
    date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
const zar = (cents: number) => new Intl.NumberFormat('en-ZA', {
  style: 'currency', currency: 'ZAR',
}).format((cents || 0) / 100);

export function CustomerAdminDetailPage({ customer, data, route, connected }: any) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(!!connected);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [revision, setRevision] = useState(0);
  const id = customer?.id || '';
  const live = Boolean(connected);

  useEffect(() => {
    if (!live || !id) { setDetail(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError('');
    api('/admin/customers/' + encodeURIComponent(id))
      .then((record) => { if (active) setDetail(record); })
      .catch((reason: any) => { if (active) {
        setDetail(null);
        setError(reason?.message || 'Could not load customer details.');
      } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [live, id, revision]);

  if (!customer) return <Missing route={route} back="customers" />;
  if (loading && !detail) return (
    <div className="admin-detail-page">
      <DetailBack label="Back to customers" onClick={() => route('customers')} />
      <p role="status">Loading customer account, vehicles and bookings…</p>
    </div>
  );
  if (live && error && !detail) return (
    <div className="admin-detail-page">
      <DetailBack label="Back to customers" onClick={() => route('customers')} />
      <DetailCard title="Customer information unavailable">
        <p role="alert">{error}</p>
        <button className="secondary" type="button" onClick={() => setRevision(v => v + 1)}>
          Try again
        </button>
      </DetailCard>
    </div>
  );
  const account = live ? detail?.customer || customer : customer;
  const demoJobs = bookingsForCustomer(data.jobs, customer.id);
  const jobs = live ? detail?.bookings || [] : demoJobs.map((job: any) => ({
    id: job.id, status: job.status, appointmentAt: job.date,
    description: job.description, professional: job.provider,
    vehicle: { make: job.vehicle || '', model: '', registration: job.registration || '' },
    confirmedPaidCents: 0,
  }));
  const vehicles = live
    ? detail?.vehicles || []
    : (data.vehicles || []).filter((vehicle: any) => vehicle.customerId === customer.id);
  const stats = accountMetrics(demoJobs);
  const counts = live ? {
    total: detail?.bookingTotal || 0,
    completed: detail?.bookingCounts?.completed || 0,
    active: detail?.bookingCounts?.active || 0,
    stopped: detail?.bookingCounts?.stopped || 0,
  } : stats;
  const vehicleTotal = live ? detail?.vehicleTotal || 0 : vehicles.length;
  const disabled = Boolean(account.disabledAt);
  const initials = String(account.name || 'Customer').trim().split(/\s+/).slice(0, 2)
    .map((part: string) => part[0] || '').join('').toUpperCase();
  const paymentLabel = live ? zar(detail?.confirmedPaidCents || 0) : money(stats.paid);

  async function toggleBlock() {
    if (!live || saving) return;
    if (!disabled && !window.confirm(
      'Block this customer? They will be signed out and cannot access their account until unblocked.',
    )) return;
    setSaving(true); setError('');
    try {
      await api('/admin/users/' + encodeURIComponent(id) + '/status', 'POST', { disabled: !disabled });
      setRevision(v => v + 1);
      connected?.refresh?.();
    } catch (reason: any) {
      setError(reason?.message || 'Could not update this account.');
    } finally { setSaving(false); }
  }
  async function deleteCustomer() {
    if (!live || saving || confirmEmail !== account.email) return;
    setSaving(true); setError('');
    try {
      await api('/admin/customers/' + encodeURIComponent(id), 'DELETE', {});
      connected?.refresh?.();
      route('customers');
    } catch (reason: any) {
      setError(reason?.message || 'This account could not be deleted.');
    } finally { setSaving(false); }
  }

  return (
    <div className="admin-detail-page admin-customer-detail">
      <DetailBack label="Back to customers" onClick={() => route('customers')} />
      <section className="admin-customer-hero" aria-label="Customer account summary">
        <div className="admin-customer-identity">
          <div className="admin-customer-avatar" aria-hidden="true">
            {account.photo ? <img src={account.photo} alt="" /> : initials}
          </div>
          <div className="admin-customer-identity-copy">
            <div className="admin-customer-name-row">
              <h1>{account.name || 'Customer'}</h1>
              <span className={'admin-customer-state' + (disabled ? ' blocked' : '')}>
                {disabled ? 'Blocked' : 'Active'}
              </span>
            </div>
            <p className="muted">Customer · Registered {customerDate(account.createdAt)}</p>
            <div className="admin-customer-contact">
              <span><Mail size={15} aria-hidden="true" />{account.email || 'Email not recorded'}</span>
              <span><Phone size={15} aria-hidden="true" />{account.phone || 'Phone not recorded'}</span>
              <span><CarFront size={15} aria-hidden="true" />{vehicleTotal} vehicles</span>
              <span><CalendarDays size={15} aria-hidden="true" />{counts.total} bookings</span>
            </div>
          </div>
        </div>
        {live && (
          <div className="admin-customer-actions">
            <button type="button" className="secondary" onClick={() => void toggleBlock()} disabled={saving}>
              {disabled ? <ShieldCheck size={16} /> : <Ban size={16} />}
              {disabled ? 'Unblock customer' : 'Block customer'}
            </button>
            <button type="button" className="secondary admin-delete-trigger"
              onClick={() => { setShowDelete(v => !v); setConfirmEmail(''); }} disabled={saving}>
              <Trash2 size={16} /> Delete customer
            </button>
          </div>
        )}
      </section>
      {live && showDelete && (
        <section className="admin-customer-delete-confirm" aria-label="Confirm customer deletion">
          <strong>Confirm permanent account deletion</strong>
          <p>
            Only accounts without vehicles, bookings or historical records can be deleted.
            Otherwise block the account to preserve service records. Type the customer's
            email address to confirm.
          </p>
          <div className="admin-customer-confirm-controls">
            <input aria-label="Confirm customer email" type="text" value={confirmEmail}
              onChange={event => setConfirmEmail(event.target.value)} autoComplete="off" />
            <button type="button" onClick={() => void deleteCustomer()} disabled={saving || confirmEmail !== account.email}>
              Permanently delete
            </button>
            <button type="button" className="secondary" onClick={() => setShowDelete(false)}>Cancel</button>
          </div>
        </section>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-customer-metrics" aria-label="Customer booking statistics">
        {[
          ['Total bookings', counts.total],
          ['Completed', counts.completed],
          ['Active', counts.active],
          ['Cancelled / rejected', counts.stopped],
        ].map(([label, number]) => (
          <div key={label}><strong>{number}</strong><span>{label}</span></div>
        ))}
      </div>
      <div className="admin-customer-activity-note">
        <Wallet size={17} aria-hidden="true" />
        <span>Confirmed recorded payments: <strong>{paymentLabel}</strong></span>
        <small>{live ? 'Excludes test payments.' : 'Demo payment totals.'}</small>
      </div>
      <DetailCard title={`Customer vehicles (${vehicleTotal})`} icon={<CarFront size={20} />}>
        {vehicles.length ? (
          <div className="admin-customer-vehicles">
            {vehicles.map((car: any) => (
              <div key={car.id} className="admin-customer-vehicle">
                <div className="admin-customer-vehicle-symbol"><CarFront size={26} aria-hidden="true" /></div>
                <div>
                  <strong>{[car.year, car.make, car.model].filter(Boolean).join(' ') || 'Vehicle'}</strong>
                  <small>{car.variant || car.bodyStyle || 'Vehicle record'}</small>
                  <span>Registration: {car.registration || 'Not recorded'}</span>
                  <span>Mileage: {car.mileage == null ? 'Not recorded' : Number(car.mileage).toLocaleString('en-ZA') + ' km'}</span>
                  {car.archivedAt || car.archived ? <em>Archived</em> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted">No vehicles registered by this customer.</p>}
        {live && vehicleTotal > vehicles.length ?
          <p className="muted">Showing the latest {vehicles.length} of {vehicleTotal} vehicles.</p> : null}
      </DetailCard>
      <DetailCard title={`Customer booking history (${counts.total})`} icon={<CalendarDays size={20} />}>
        {jobs.length ? (
          <div className="admin-customer-booking-list">
            {jobs.map((job: any) => (
              <article className="admin-customer-booking" key={job.id}>
                <div className="admin-customer-booking-main">
                  <strong>{[job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') ||
                    (typeof job.vehicle === 'string' ? job.vehicle : 'Vehicle not recorded')}</strong>
                  <span>{job.professional || job.provider || 'Workshop not recorded'}</span>
                  <small>{customerDate(job.appointmentAt || job.createdAt)}
                    {job.vehicle?.registration ? ' · ' + job.vehicle.registration : ''}
                  </small>
                  {job.description && <p>{job.description}</p>}
                </div>
                <div className="admin-customer-booking-side">
                  <StatusBadge value={customerBookingStatus[job.status] || job.status} />
                  {live && <small>{zar(job.confirmedPaidCents || 0)} confirmed</small>}
                  {(data.jobs || []).some((loaded: any) => loaded.id === job.id) && (
                    <button className="text-link" type="button" onClick={() => route('jobs/' + encodeURIComponent(job.id))}>
                      View job <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="muted">No bookings recorded for this customer.</p>}
        {live && counts.total > jobs.length ?
          <p className="muted">Showing the latest {jobs.length} of {counts.total} bookings.</p> : null}
      </DetailCard>
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
