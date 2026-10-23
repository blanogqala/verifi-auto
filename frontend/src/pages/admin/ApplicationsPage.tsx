import { useState } from 'react';
import { CityFilter, ProfessionalTypeFilter } from './AdminFilters';
import { matchesAdminFilters } from '../../features/admin/filters';
import { ArrowUpRight, History, Search } from 'lucide-react';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { EmptyState as Empty } from '../../components/ui/EmptyState';

function matches(application: any, query: string) {
  return `${application.name} ${application.email || ''} ${application.city} ${application.type}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

/** Pending applications, or the retained decisions that have left that queue. */
export function ApplicationsPage({
  apps,
  history,
  openReview,
  query,
  route,
  setQuery,
  live = false,
}: any) {
  const [city, setCity] = useState('All');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const visible = apps.filter(
    (application: any) =>
      (history || status === 'All' || application.status === status) &&
      matches(application, query) && matchesAdminFilters(application, city, type),
  );
  return (
    <>
      <div className="table-controls admin-filter-row">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search professional or location"
          />
        </div>
        <CityFilter rows={apps} value={city} onChange={setCity} />
        <ProfessionalTypeFilter value={type} onChange={setType} />
        {!history && live && (
          <select aria-label="Filter application status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            <option>Incomplete</option>
            <option>Pending review</option>
          </select>
        )}
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
          : live
            ? 'New registrations appear as Incomplete. After the mechanic submits their profile and evidence, the status changes to Pending review.'
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
                <th>{history ? 'Decision' : 'Registered / submitted'}</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((application: any) => (
                <tr
                  className="admin-clickable-row"
                  key={application.id}
                  onClick={() => openReview(application)}
                >
                  <td>
                    <b>{application.name}</b>
                    <small>
                      {application.type}
                      {live ? (
                        <small>
                          {application.email || 'No email'} · {application.emailVerified ? 'Email verified' : 'Email not verified'}
                          {' · '}{application.documents?.length || 0} document(s)
                        </small>
                      ) : application.own
                          ? ' · Your demo application'
                          : ' · Sample application'}
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
                    <button
                      className="text-link"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openReview(application);
                      }}
                    >
                      {live && application.status === 'Incomplete' ? 'View progress' : 'View application'} <ArrowUpRight size={15} />
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
                : 'No mechanic registrations or submitted applications yet.'
          }
          text={
            apps.length
              ? 'Try another search.'
              : history
                ? 'Rejections and requests for changes remain available here after they leave the pending queue.'
                : 'New mechanic registrations appear here immediately. Approved professionals appear under Users.'
          }
        />
      )}
    </>
  );
}
