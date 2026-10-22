import { useState } from 'react';
import { Bell, Calendar, FileText, MessageSquare, Search, Wallet, Wrench } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { RoadLoader } from '../components/ui/RoadLoader';
import { WorkspaceHeading } from './LiveWorkspaceViews';
import { api } from './api';
export function LiveNotifications({ notes, error, role, run, go }: any) {
  const [filter, setFilter] = useState('All'),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState('');
  const visible = (notes || []).filter(
    (n: any) =>
      (filter !== 'Unread' || !n.readAt) &&
      (['All', 'Unread'].includes(filter) || n.topic === filter) &&
      n.title.toLowerCase().includes(query.toLowerCase()),
  );
  const active = (notes || []).find((n: any) => n.id === selected);
  const mark = (ids: string[]) => run(() => api('/notifications/read', 'POST', { ids }), '');
  const destination = (note: any) =>
    ['booking', 'quotation', 'message', 'payment', 'history-access'].includes(note.topic)
      ? `dashboard/${role === 'customer' ? 'bookings' : 'jobs'}/${note.resourceId}`
      : note.topic === 'application'
        ? role === 'admin'
          ? 'dashboard/applications/' + note.resourceId
          : 'dashboard/profile/verification'
        : 'dashboard/profile';
  const topicIcon: Record<string, any> = {
    booking: Calendar,
    quotation: FileText,
    message: MessageSquare,
    payment: Wallet,
    application: Wrench,
    'history-access': FileText,
  };
  return (
    <>
      <WorkspaceHeading title="Notifications" />
      <div className={'inbox live-inbox' + (active ? ' is-reading' : '')}>
        <Card className="dash-panel inbox-list">
          <div className="panel-title">
            <h2>Your updates</h2>
            <button
              className="text-link"
              disabled={!notes?.some((n: any) => !n.readAt)}
              onClick={() => mark(notes.filter((n: any) => !n.readAt).map((n: any) => n.id))}
            >
              Mark all as read
            </button>
          </div>
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label="Search updates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="inbox-filters" role="toolbar" aria-label="Notification filters">
            {['All', 'Unread', ...new Set<string>((notes || []).map((n: any) => n.topic))].map(
              (f) => (
                <button
                  key={f}
                  className={filter === f ? 'selected' : ''}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ),
            )}
          </div>
          {error ? (
            <p role="alert">{error}</p>
          ) : !notes ? (
            <RoadLoader label="Loading updates…" />
          ) : visible.length ? (
            <div className="inbox-threads">
              {visible.map((n: any) => {
                const Icon = topicIcon[n.topic] || Bell;
                return (
                <button
                  key={n.id}
                  className={
                    'inbox-thread' +
                    (selected === n.id ? ' selected' : '') +
                    (!n.readAt ? ' unread' : '')
                  }
                  onClick={() => {
                    setSelected(n.id);
                    if (!n.readAt) void mark([n.id]);
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>
                    <b>{n.title}</b>
                    <small>{new Date(n.createdAt).toLocaleString()}</small>
                  </span>
                  {!n.readAt ? <i aria-label="Unread" /> : null}
                </button>
                );
              })}
            </div>
          ) : (
            <p>
              {filter === 'Unread'
                ? 'No unread updates.'
                : query
                  ? 'No updates match that search.'
                  : 'No updates yet.'}
            </p>
          )}
        </Card>
        <Card className="dash-panel inbox-detail">
          <button className="detail-back live-inbox-back" onClick={() => setSelected('')}>
            Back to notifications
          </button>
          {active ? (
            <>
              <h2>{active.title}</h2>
              <article className="inbox-item">
                <Bell size={16} />
                <div>
                  <p>{active.title}</p>
                  <small>{new Date(active.createdAt).toLocaleString()}</small>
                  <p>
                    <button className="text-link" onClick={() => go(destination(active))}>
                      Open
                    </button>
                  </p>
                </div>
              </article>
            </>
          ) : (
            <p>Select an update to read it.</p>
          )}
        </Card>
      </div>
    </>
  );
}
