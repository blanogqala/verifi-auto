import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { DetailCard } from '../../components/ui/DetailChrome';
import { formatWhen } from '../../features/jobs/bookingProgress';

export function SecurityActivityPage({ data, live = false }: any) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');
  const [action, setAction] = useState('All');
  const events = (Array.isArray(data.adminActivity) ? data.adminActivity : [])
    .filter(
      (event: any) =>
        (role === 'All' || event.role === role) &&
        (action === 'All' || event.action === action) &&
        `${event.actor} ${event.action} ${event.target || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .slice()
    .sort((a: any, b: any) => String(b.at).localeCompare(String(a.at)));
  return (
    <DetailCard title="Security & activity" icon={<ShieldCheck size={20} />}>
      <p className="muted">
        {live
          ? 'Recent server-recorded sign-ins, sign-outs and administrative actions. This is an audit trail, not a list of people currently online.'
          : 'Activity recorded in this browser demo, from this update onward. This is not a server security audit or a list of people currently online. The latest 500 events are retained.'}
      </p>
      <div className="table-controls">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Search activity"
            placeholder="Search person or action"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select aria-label="Activity role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option>All</option>
          <option value="customer">Customer</option>
          <option value="mechanic">Mechanic</option>
          <option value="admin">Admin</option>
        </select>
        <select
          aria-label="Activity action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option>All</option>
          <option>Signed in</option>
          <option>Signed out</option>
          {Array.from(new Set<string>((data.adminActivity || []).map((e: any) => e.action)))
            .filter((a) => !['Signed in', 'Signed out'].includes(a))
            .map((a) => (
              <option key={a}>{a}</option>
            ))}
        </select>
      </div>
      {events.length ? (
        <div className="admin-audit-list">
          {events.map((event: any) => (
            <article className="admin-audit-event" key={event.id}>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <b>{event.action}</b>
                <p>
                  {event.actor} · {event.role}
                </p>
                {event.target && <small>Record: {event.target}</small>}
              </div>
              <time dateTime={event.at}>{formatWhen(event.at)}</time>
            </article>
          ))}
        </div>
      ) : (
        <p>
          No matching activity recorded yet. Sign-ins, sign-outs, and application decisions will
          appear here as they happen.
        </p>
      )}
    </DetailCard>
  );
}
