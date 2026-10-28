import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  DetailBack,
  DetailHeader,
  DetailCard,
  DetailFields,
} from '../../components/ui/DetailChrome';
import { CityFilter, ProfessionalTypeFilter } from './AdminFilters';
import {
  adminJobRows,
  disputeRows,
  matchesAdminFilters,
  resolveDispute,
} from '../../features/admin/filters';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { appendAdminActivity } from '../../features/admin/detailRecords';
import { formatWhen } from '../../features/jobs/bookingProgress';
import { transitionJob } from '../../features/jobs/jobWorkflow';

export function AdminJobsPage({ data, cardJobs, route, section, live = false }: any) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All');
  const [type, setType] = useState('All');
  const [jobStatus, setJobStatus] = useState('All');
  const [disputeStatus, setDisputeStatus] = useState('All');
  const jobs = live ? data.jobs || [] : adminJobRows(data);
  const disputes = disputeRows(data).map((d: any) => {
    const job = jobs.find((j: any) => j.id === d.bookingId);
    return { ...d, city: job?.city || 'Not recorded', type: job?.type || 'Not recorded', job };
  });
  const showingDisputes = section === 'disputes';
  const source = showingDisputes ? disputes : jobs;
  const status = showingDisputes ? disputeStatus : jobStatus;
  const statuses = showingDisputes
    ? ['All', 'Open', 'Under review', 'Resolved']
    : [
        'All',
        'Requested',
        'Rejected',
        'Confirmed',
        'Awaiting approval',
        'Changes requested',
        'Approved',
        'Ready to start',
        'In progress',
        'Awaiting payment',
        'Awaiting confirmation',
        'Disputed',
        'Completed',
        'Cancelled',
      ];
  const visible = source.filter(
    (row: any) =>
      matchesAdminFilters(row, city, type) &&
      (status === 'All' || row.status === status) &&
      `${row.id} ${row.title || ''} ${row.vehicle || row.job?.vehicle || ''} ${row.provider || row.job?.provider || ''} ${row.customerName || row.job?.customerName || ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="table-controls admin-filter-row">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Search jobs and disputes"
            placeholder="Search vehicle, person or reference"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label={showingDisputes ? 'Dispute status' : 'Job status'}
          value={status}
          onChange={(e) =>
            showingDisputes ? setDisputeStatus(e.target.value) : setJobStatus(e.target.value)
          }
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <CityFilter
          rows={jobs}
          label={live ? 'Professional city' : 'Customer city'}
          value={city}
          onChange={setCity}
        />
        <ProfessionalTypeFilter value={type} onChange={setType} />
      </div>
      <nav className="profile-tablist" aria-label="Jobs and activity sections">
        <button
          className={!showingDisputes ? 'selected' : ''}
          aria-current={!showingDisputes ? 'page' : undefined}
          onClick={() => route('jobs')}
        >
          Jobs <span>{jobs.length}</span>
        </button>
        <button
          className={showingDisputes ? 'selected' : ''}
          aria-current={showingDisputes ? 'page' : undefined}
          onClick={() => route('jobs/disputes')}
        >
          Disputes <span>{disputes.length}</span>
        </button>
      </nav>
      <p className="muted">
        {visible.length} matching {showingDisputes ? 'disputes' : 'jobs'} ·{' '}
        {live
          ? 'City refers to the professional’s recorded city.'
          : 'City refers to the customer’s recorded city.'}
      </p>
      {visible.length ? (
        showingDisputes ? (
          <div className="job-grid">
            {visible.map((d: any) => (
              <Card
                as="button"
                type="button"
                className="admin-dispute-card"
                key={d.id}
                onClick={() => route('disputes/' + encodeURIComponent(d.id))}
              >
                <StatusBadge value={d.status} />
                <h2>{d.title || 'Booking dispute'}</h2>
                <p>{d.job?.vehicle || 'Booking not linked'}</p>
                <small>
                  {d.id} · {d.city}
                </small>
              </Card>
            ))}
          </div>
        ) : (
          <div className="job-grid">{cardJobs(visible)}</div>
        )
      ) : (
        <Card className="dash-panel">
          <h2>{showingDisputes ? 'No disputes to show' : 'No jobs match these filters'}</h2>
          <p>
            {showingDisputes && !disputes.length
              ? live
                ? 'Customer disputes about completed repairs will appear here for administrator review.'
                : 'Booking disputes will appear here when recorded. No dispute has been created in this browser demo.'
              : 'Try another city, professional type or status.'}
          </p>
        </Card>
      )}
    </>
  );
}
export function AdminDisputePage({ data, id, route, update, notify }: any) {
  const [resolution, setResolution] = useState('');
  const [decision, setDecision] = useState<'resolve-accept' | 'resolve-rework'>('resolve-rework');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dispute = disputeRows(data).find((d: any) => d.id === id);
  const job = dispute && (data.jobs || []).find((j: any) => j.id === dispute.bookingId);

  async function resolve() {
    if (!dispute || !job || resolution.trim().length < 10 || busy) return;
    setBusy(true);setError('');
    try {
      await update((current: any) => {
        const source = current.jobs.find((entry: any) => entry.id === job.id);
        const changed = transitionJob(source, decision, { reason: resolution.trim() });
        return {
          ...current,
          jobs: current.jobs.map((entry: any) => entry.id === job.id ? changed : entry),
          // Do not mutate the disconnected admin disputes collection for live bookings.
        };
      });
      notify(decision === 'resolve-accept'
        ? 'Dispute resolved: service accepted. No funds were released by Verifi Auto.'
        : 'Dispute resolved: workshop asked to perform corrective work.');
    } catch (reason: any) { setError(reason?.message || 'Could not resolve dispute.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-detail-page">
      <DetailBack label="Back to disputes" onClick={() => route('jobs/disputes')} />
      {dispute ? (
        <>
          <DetailHeader title={dispute.title || 'Booking dispute'} summary={dispute.id}
            aside={<StatusBadge value={dispute.status} />}/>
          <DetailCard title="Dispute details">
            <DetailFields items={[
              { label: 'Booking', value: dispute.bookingId || 'Not linked' },
              { label: 'Opened', value: formatWhen(dispute.createdAt) || 'Date not recorded' },
              { label: 'Workshop', value: job?.provider || 'Not recorded' },
              { label: 'Customer', value: job?.customerName || 'Not recorded' },
            ]}/>
            <p>{dispute.description || dispute.note || 'No details provided.'}</p>
            {job && <button className="secondary" onClick={() => route('jobs/' + encodeURIComponent(job.id))}>Review full booking</button>}
          </DetailCard>
          <DetailCard title="Administrator resolution">
            {dispute.status === 'Resolved' ? (
              <>
                <p>{dispute.resolution}</p>
                <small>{dispute.resolvedBy || 'Administrator'} · {formatWhen(dispute.resolvedAt)}</small>
              </>
            ) : job && dispute.liveBooking ? (
              <>
                <p>Review the customer's account, the mechanic's work report and the booking messages before deciding.</p>
                <div className="service-admin-choices">
                  <label><input type="radio" checked={decision === 'resolve-rework'} onChange={() => setDecision('resolve-rework')}/> Require corrective work</label>
                  <label><input type="radio" checked={decision === 'resolve-accept'} onChange={() => setDecision('resolve-accept')}/> Accept service as completed</label>
                </div>
                <label className="field-label">Resolution and supporting reasons
                  <textarea minLength={10} maxLength={2000} value={resolution} onChange={e => setResolution(e.target.value)}
                    placeholder="Explain your findings and what happens next…" />
                </label>
                <button className="primary" disabled={busy || resolution.trim().length < 10} onClick={() => void resolve()}>
                  {busy ? 'Recording decision…' : 'Record dispute decision'}
                </button>
                <p className="muted">No refund or escrow payout is processed here. Financial remediation requires a verified payment-provider integration and a separate reconciliation process.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
              </>
            ) : (
              <>
                <label className="field-label">Resolution notes
                  <textarea value={resolution} onChange={(event) => setResolution(event.target.value)}
                    placeholder="Record the agreed outcome and follow-up"/>
                </label>
                <button type="button" className="primary" disabled={!resolution.trim() || busy}
                  onClick={() => {
                    commitUpdate(update, (current: any) => {
                      const next = resolveDispute(current, id, resolution, current.adminAccount?.name || 'Admin');
                      return next === current ? current : appendAdminActivity(next, {
                        action: 'Dispute resolved', actor: current.adminAccount?.name || 'Admin',
                        role: 'admin', target: id,
                      });
                    }, notify, 'Demo dispute resolved. No payment or booking status was changed.');
                  }}>Resolve demo dispute</button>
                <p className="muted">This historical demo dispute records an administrative outcome only. No payment, refund or booking status is changed.</p>
              </>
            )}
          </DetailCard>
        </>
      ) : <DetailCard title="Dispute not found"><p>Return to the list to choose an available dispute.</p></DetailCard>}
    </div>
  );
}
