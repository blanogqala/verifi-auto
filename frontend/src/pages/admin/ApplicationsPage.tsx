import { ArrowUpRight, Search } from 'lucide-react';

import { StatusBadge as Status } from '../../components/ui/StatusBadge';

import { EmptyState as Empty } from '../../components/ui/EmptyState';

/** Presentational view. State and actions are supplied by the owning layout. */
export function ApplicationsPage({
  apps,
  filter,
  name,
  openReview,
  query,
  setFilter,
  setQuery,
}: any) {
  return (
    <>
      <div className="table-controls">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search professional or location"
          />
        </div>
        <select
          aria-label="Filter applications"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['All', 'Pending review', 'Approved', 'Changes requested', 'Rejected', 'Suspended'].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Professional</th>
              <th>Location</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {apps
              .filter(
                (a: any) =>
                  (filter === 'All' || a.status === filter) &&
                  `${a.name} ${a.city}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map((a: any) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                    <small>
                      {a.type}
                      {a.own ? ' · Your demo application' : ''}
                    </small>
                  </td>
                  <td>{a.city}</td>
                  <td>
                    <Status value={a.status} />
                  </td>
                  <td>{a.date}</td>
                  <td>
                    <button className="text-link" onClick={() => openReview(a)}>
                      View application <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!apps.filter(
        (a: any) =>
          (filter === 'All' || a.status === filter) &&
          `${a.name} ${a.city}`.toLowerCase().includes(query.toLowerCase()),
      ).length && (
        <Empty title="No matching applications." text="Try another search or status filter." />
      )}
    </>
  );
}
