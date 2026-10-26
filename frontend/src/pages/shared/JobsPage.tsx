import { Search } from 'lucide-react';
import { bookingReference } from '../../features/jobs/jobViews';

import { EmptyState as Empty } from '../../components/ui/EmptyState';

/** Presentational view. State and actions are supplied by the owning layout. */
export function JobsPage({
  cardJobs,
  emptyText = 'Try a different search or status filter.',
  emptyTitle = 'No appointments match.',
  filter,
  hint,
  jobs,
  query,
  setFilter,
  setQuery,
  statuses,
  scope,
  onScopeChange,
}: any) {
  const options = statuses || [
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
  const visible = jobs.filter(
    (j: any) =>
      (filter === 'All' || j.status === filter) &&
      `${bookingReference(j)} ${j.provider || ''} ${j.vehicle || ''} ${hint ? hint(j) : ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      {onScopeChange && <div className="roadside-job-tabs" role="group" aria-label="Job category"><button type="button" aria-pressed={scope !== 'emergencies'} className={scope !== 'emergencies' ? 'selected' : ''} onClick={() => onScopeChange('all')}>All accepted jobs</button><button type="button" aria-pressed={scope === 'emergencies'} className={scope === 'emergencies' ? 'selected' : ''} onClick={() => onScopeChange('emergencies')}>Emergency jobs</button></div>}
      <div className="table-controls">
        <label className="search-input">
          <Search size={17} aria-hidden="true" />
          <span className="visually-hidden">Search</span>
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            aria-label="Search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter job status"
          value={options.includes(filter) ? filter : 'All'}
          onChange={(e) => setFilter(e.target.value)}
        >
          {options.map((s: string) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="job-grid">
        {cardJobs(visible)}
      </div>
      {!visible.length && <Empty title={emptyTitle} text={emptyText} />}
    </>
  );
}
