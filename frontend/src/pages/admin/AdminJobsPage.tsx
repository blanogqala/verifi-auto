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

export function AdminJobsPage({ data, cardJobs, route, section }: any) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All');
  const [type, setType] = useState('All');
  const [jobStatus, setJobStatus] = useState('All');
  const [disputeStatus, setDisputeStatus] = useState('All');
  const jobs = adminJobRows(data);
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
        'In progress',
        'Awaiting payment',
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
        <CityFilter rows={jobs} label="Customer city" value={city} onChange={setCity} />
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
        {visible.length} matching {showingDisputes ? 'disputes' : 'jobs'} · City refers to the
        customer’s recorded city.
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
              ? 'Booking disputes will appear here when recorded. No dispute has been created in this browser demo.'
              : 'Try another city, professional type or status.'}
          </p>
        </Card>
      )}
    </>
  );
}
export function AdminDisputePage({ data, id, route, update, notify }: any) {
  const [resolution, setResolution] = useState('');
  const dispute = disputeRows(data).find((d: any) => d.id === id);
  const job = dispute && (data.jobs || []).find((j: any) => j.id === dispute.bookingId);
  function resolve() {
    commitUpdate(
      update,
      (current: any) => {
        const next = resolveDispute(current, id, resolution, current.adminAccount?.name || 'Admin');
        return next === current
          ? current
          : appendAdminActivity(next, {
              action: 'Dispute resolved',
              actor: current.adminAccount?.name || 'Admin',
              role: 'admin',
              target: id,
            });
      },
      notify,
      'Demo dispute resolved. No payment or booking status was changed.',
    );
  }
  return (
    <div className="admin-detail-page">
      <DetailBack label="Back to disputes" onClick={() => route('jobs/disputes')} />
      {dispute ? (
        <>
          <DetailHeader
            title={dispute.title || 'Booking dispute'}
            summary={dispute.id}
            aside={<StatusBadge value={dispute.status} />}
          />
          <DetailCard title="Dispute details">
            <DetailFields
              items={[
                { label: 'Booking', value: dispute.bookingId || 'Not linked' },
                { label: 'Opened', value: formatWhen(dispute.createdAt) || 'Date not recorded' },
              ]}
            />
            <p>{dispute.description || dispute.note || 'No details provided.'}</p>
            {job && (
              <button
                className="secondary"
                onClick={() => route('jobs/' + encodeURIComponent(job.id))}
              >
                View booking
              </button>
            )}
          </DetailCard>
          <DetailCard title="Resolution">
            {dispute.status === 'Resolved' ? (
              <>
                <p>{dispute.resolution}</p>
                <small>
                  {dispute.resolvedBy} · {formatWhen(dispute.resolvedAt)}
                </small>
              </>
            ) : (
              <>
                <label className="field-label">
                  Resolution notes
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Record the agreed outcome and follow-up"
                  />
                </label>
                <button className="primary" disabled={!resolution.trim()} onClick={resolve}>
                  Resolve demo dispute
                </button>
                <p className="muted">
                  Records an administrative outcome only. It does not issue a refund or change the
                  job.
                </p>
              </>
            )}
          </DetailCard>
        </>
      ) : (
        <DetailCard title="Dispute not found">
          <p>Return to the list to choose an available dispute.</p>
        </DetailCard>
      )}
    </div>
  );
}
