import { ArrowUpRight, History, Search } from 'lucide-react';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { EmptyState as Empty } from '../../components/ui/EmptyState';

function matches(application: any, query: string) {
  return `${application.name} ${application.city} ${application.type}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

/** Pending applications, or the retained decisions that have left that queue. */
export function ApplicationsPage({ apps, history, openReview, query, route, setQuery }: any) {
  const visible = apps.filter((application: any) => matches(application, query));
  return (
    <>
      <div className="table-controls">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search professional or location"
          />
        </div>
        <button
          className="secondary"
          type="button"
          onClick={() => route(history ? 'applications' : 'applications/history')}
        >
          <History size={16} />
          {history ? 'Pending queue' : 'Review history'}
        </button>
      </div>
      <p className="muted">
        {history
          ? 'Rejections and requests for changes stay here with their evidence, decision, and feedback. Resubmitted applications return to the pending queue.'
          : 'Only applications currently waiting for review are listed here.'}
      </p>
      {visible.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Professional</th>
                <th>Location</th>
                <th>Status</th>
                <th>{history ? 'Decision' : 'Submitted'}</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((application: any) => (
                <tr key={application.id}>
                  <td>
                    <b>{application.name}</b>
                    <small>
                      {application.type}
                      {application.own ? ' · Your demo application' : ' · Sample application'}
                    </small>
                  </td>
                  <td>{application.city}</td>
                  <td>
                    <Status value={application.status} />
                  </td>
                  <td>
                    {history ? (
                      <>
                        {application.note || 'No feedback recorded'}
                        {application.date ? <small>{application.date}</small> : null}
                      </>
                    ) : (
                      application.date || 'Not recorded'
                    )}
                  </td>
                  <td>
                    <button className="text-link" type="button" onClick={() => openReview(application)}>
                      View application <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={
            apps.length
              ? 'No matching applications.'
              : history
                ? 'No review history yet.'
                : 'No applications are waiting for review.'
          }
          text={
            apps.length
              ? 'Try another search.'
              : history
                ? 'Rejections and requests for changes remain available here after they leave the pending queue.'
                : 'New submissions appear here while their status is Pending review. Approved professionals are listed under Users.'
          }
        />
      )}
    </>
  );
}
