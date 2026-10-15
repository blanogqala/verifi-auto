import { ArrowUpRight, Search } from 'lucide-react';
import { contactLine } from '../../features/admin/applicationRecords';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { EmptyState as Empty } from '../../components/ui/EmptyState';

const filters = ['All', 'Approved', 'Suspended'];

function matches(professional: any, query: string) {
  return `${professional.name} ${professional.type} ${professional.city} ${professional.phone || ''} ${professional.email || ''}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

/** Approved professionals, including profiles suspended after approval. */
export function ProfessionalsAdminPage({
  apps,
  filter,
  openReview,
  query,
  setFilter,
  setQuery,
}: any) {
  const selected = filters.includes(filter) ? filter : 'All';
  const visible = apps.filter(
    (professional: any) =>
      (selected === 'All' || professional.status === selected) && matches(professional, query),
  );
  return (
    <>
      <div className="table-controls">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search business, type, or location"
          />
        </div>
        <select
          aria-label="Filter professionals"
          value={selected}
          onChange={(event) => setFilter(event.target.value)}
        >
          {filters.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <p className="muted">
        Sample professional records. Verification status is separate from approval history, so a
        suspended profile stays in this list.
      </p>
      {visible.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Type</th>
                <th>Location</th>
                <th>Verification</th>
                <th>Contact</th>
                <th>Profile</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((professional: any) => (
                <tr key={professional.id}>
                  <td>
                    <b>{professional.name}</b>
                    <small>{professional.own ? 'Your demo application' : 'Sample record'}</small>
                  </td>
                  <td>{professional.type || 'Not recorded'}</td>
                  <td>{professional.city || 'Not recorded'}</td>
                  <td>
                    <Status value={professional.status} />
                  </td>
                  <td>{contactLine(professional)}</td>
                  <td>
                    <button className="text-link" type="button" onClick={() => openReview(professional)}>
                      View profile <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={apps.length ? 'No matching professionals.' : 'No professionals yet.'}
          text={
            apps.length
              ? 'Try another search or verification status.'
              : 'Approved applications appear here, including profiles that are later suspended.'
          }
        />
      )}
    </>
  );
}
