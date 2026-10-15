import { Search } from 'lucide-react';

import { EmptyState as Empty } from '../../components/ui/EmptyState';

/** Presentational view. State and actions are supplied by the owning layout. */
export function JobsPage({
  cardJobs,
  emptyText = 'Try a different search or status filter.',
  emptyTitle = 'No appointments match.',
  filter,
  jobs,
  query,
  setFilter,
  setQuery,
  statuses,
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
  return (
    <>
      <div className="table-controls">
        <div className="search-input">
          <Search size={17} />
          <input
            placeholder="Search vehicle, reference, or professional"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
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
        {cardJobs(
          jobs.filter(
            (j: any) =>
              (filter === 'All' || j.status === filter) &&
              `${j.id} ${j.provider} ${j.vehicle}`.toLowerCase().includes(query.toLowerCase()),
          ),
        )}
      </div>
      {!jobs.some(
        (j: any) =>
          (filter === 'All' || j.status === filter) &&
          `${j.id} ${j.provider} ${j.vehicle}`.toLowerCase().includes(query.toLowerCase()),
      ) && <Empty title={emptyTitle} text={emptyText} />}
    </>
  );
}
