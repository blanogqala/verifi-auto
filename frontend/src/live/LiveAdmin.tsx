import { DetailCard, DetailBack, DetailFields } from '../components/ui/DetailChrome';
import { api, apiBase } from './api';
import { RoadLoader } from '../components/ui/RoadLoader';
import { useResource } from './useResource';
export function LiveAdmin({ section, revision, run, go, refresh }: any) {
  const [base, resourceId] = section.split('/');
  const path =
    resourceId && ['applications', 'professionals'].includes(base)
      ? `/admin/professionals/${resourceId}`
      : base === 'applications'
        ? '/admin/applications'
        : ['customers', 'professionals'].includes(base)
          ? `/admin/users?role=${base === 'customers' ? 'CUSTOMER' : 'MECHANIC'}`
          : base === 'reports'
            ? '/admin/activity'
            : '/admin/overview';
  const { data, error } = useResource(path, revision);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <RoadLoader label="Loading administration…" />;
  if (resourceId && ['applications', 'professionals'].includes(base))
    return (
      <div className="detail-page">
        <DetailBack label="Back to applications" onClick={() => go('dashboard/applications')} />
        <DetailCard title={data.name}>
          <DetailFields
            items={[
              { label: 'Status', value: data.status },
              { label: 'City', value: data.city },
              { label: 'Type', value: data.type },
              { label: 'Email', value: data.user.email },
            ]}
          />
          <p>{data.about}</p>
          <p>{data.services.join(' · ')}</p>
          {data.user.documents.map((doc: any) => (
            <p key={doc.id}>
              <a href={`${apiBase}/api/documents/${doc.id}`} target="_blank" rel="noreferrer">
                Download {doc.kind.toLowerCase()} · {doc.name}
              </a>
            </p>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const input = Object.fromEntries(new FormData(event.currentTarget));
              void run(async () => {
                await api(`/admin/professionals/${data.id}/review`, 'POST', {
                  ...input,
                  version: data.version,
                });
                refresh();
              }, 'Application decision saved.');
            }}
          >
            <label>
              Decision
              <select name="status">
                {data.status === 'APPROVED' ? (
                  <option value="SUSPENDED">Suspend credential</option>
                ) : (
                  <>
                    <option value="APPROVED">Approve application</option>
                    <option value="CHANGES_REQUESTED">Request changes</option>
                  </>
                )}
              </select>
            </label>
            <label>
              Review notes
              <textarea name="note" minLength={3} required />
            </label>
            <button className="primary">Save decision</button>
          </form>
        </DetailCard>
      </div>
    );
  if (Array.isArray(data))
    return (
      <div className="detail-page">
        <h1>{base === 'reports' ? 'Security activity' : base}</h1>
        {data.map((row: any) => (
          <DetailCard key={row.id} title={row.name || row.action}>
            {base === 'applications' ? (
              <>
                <p>
                  {row.type} · {row.city}
                </p>
                <button className="primary" onClick={() => go('dashboard/applications/' + row.id)}>
                  Review application
                </button>
              </>
            ) : base === 'reports' ? (
              <>
                <p>{new Date(row.createdAt).toLocaleString()}</p>
                <small>Actor {row.actorId}</small>
              </>
            ) : (
              <>
                <p>{row.email}</p>
                <p>{row.verifiedAt ? 'Email verified' : 'Email not verified'}</p>
                <button
                  className="secondary"
                  onClick={() =>
                    run(async () => {
                      await api(`/admin/users/${row.id}/status`, 'POST', {
                        disabled: !row.disabledAt,
                      });
                      refresh();
                    }, 'Account status updated.')
                  }
                >
                  {row.disabledAt ? 'Enable account' : 'Disable account'}
                </button>
              </>
            )}
          </DetailCard>
        ))}
        {!data.length ? <p>No records yet.</p> : null}
      </div>
    );
  return (
    <div className="detail-page">
      <h1>Platform overview</h1>
      <div className="live-card-grid">
        {[
          ['Customers', data.customers],
          ['Approved professionals', data.professionals],
          ['Pending applications', data.applications],
        ].map(([label, value]) => (
          <DetailCard key={label} title={label}>
            <strong>{value}</strong>
          </DetailCard>
        ))}
      </div>
      <DetailCard title="Bookings by status">
        {data.bookings.map((row: any) => (
          <p key={row.status}>
            {row.status.toLowerCase().replaceAll('_', ' ')} <b>{row._count}</b>
          </p>
        ))}
      </DetailCard>
    </div>
  );
}
