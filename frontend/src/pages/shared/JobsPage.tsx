import { Search } from 'lucide-react';

import { EmptyState as Empty } from '../../components/ui/EmptyState';

/** Presentational view. State and actions are supplied by the owning layout. */
export function JobsPage({ cardJobs, filter, jobs, query, setFilter, setQuery }: any) {
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
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            'All',
            'Requested',
            'Confirmed',
            'Awaiting approval',
            'Changes requested',
            'Approved',
            'In progress',
            'Awaiting payment',
            'Completed',
            'Cancelled',
          ].map((s) => (
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
      ) && <Empty title="No appointments match." text="Try a different search or status filter." />}
    </>
  );
}
