import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  FileText,
  MessageSquare,
  Search,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { JobConversation } from '../../components/jobs/JobConversation';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { formatWhen } from '../../features/jobs/bookingProgress';
import { bookingReference } from '../../features/jobs/jobViews';
import { merchantIdentityLabel } from '../../features/account/customerIdentity';
import { customerIdentityLabel } from '../../features/account/customerIdentity';
import { participantId } from '../../features/identity/participants';
import {
  markNotificationsRead,
  notificationDay,
  notificationDestination,
  bookingNotificationSection,
  notificationLabel,
  notificationsFor,
} from '../../features/notifications/inbox';
import { followDetail } from '../../features/navigation/returnPath';

const icons: Record<string, any> = {
  Requests: Calendar,
  Accepted: Check,
  Rejected: X,
  Cancelled: X,
  Quotations: FileText,
  Approvals: Check,
  Changes: FileText,
  Work: Wrench,
  Payments: Wallet,
  Messages: MessageSquare,
  Account: Bell,
  Updates: Bell,
};

function threadKey(note: any) {
  return note.bookingId ? `booking:${note.bookingId}` : `notice:${note.id}`;
}

export function NotificationsPage({ data, go, notify, role, update, connected }: any) {
  const self = participantId(data, role);
  const notes = useMemo(
    () => connected?.notes || notificationsFor(data, role, self),
    [connected?.notes, data, role, self],
  );
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches,
  );
  const groups = useMemo(() => {
    const present = new Set<string>();
    for (const note of notes) present.add(notificationLabel(note.type));
    return ['All', 'Unread', ...present];
  }, [notes]);
  const threads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, any[]>();
    for (const note of notes) {
      const label = notificationLabel(note.type);
      if (filter === 'Unread' && note.read === true) continue;
      if (filter !== 'All' && filter !== 'Unread' && label !== filter) continue;
      const job = (data.jobs || []).find((item: any) => item.id === note.bookingId);
      const haystack =
        `${note.title || ''} ${note.message || ''} ${bookingReference(job)} ${job?.vehicle || ''}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const key = threadKey(note);
      map.set(key, [...(map.get(key) || []), note]);
    }
    return [...map.entries()]
      .map(([key, items]) => {
        const ordered = items
          .slice()
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return { key, items: ordered, latest: ordered[0] };
      })
      .sort((a, b) =>
        String(b.latest?.createdAt || '').localeCompare(String(a.latest?.createdAt || '')),
      );
  }, [data.jobs, filter, notes, query]);
  const active = threads.find((thread) => thread.key === selected) || null;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (selected && threads.some((thread) => thread.key === selected)) return;
    if (!narrow && threads[0]) setSelected(threads[0].key);
    else if (!threads.some((thread) => thread.key === selected)) setSelected('');
  }, [narrow, selected, threads]);
  function openThread(key: string) {
    setSelected(key);
  }
  function openDestination(note: any) {
    const path = connected
      ? connected.destination(note)
      : notificationDestination(data, role, note);
    if (!path) return;
    // Opening the inbox list does not clear outstanding work. Opening its
    // associated activity acknowledges that specific notification.
    // VAR/work report notifications remain unread until the exact detail panel
    // is actually opened, rather than clearing at the inbox.
    if (!note.read && !['var', 'activity'].includes(bookingNotificationSection(note))) {
      const result = connected
        ? connected.mark([note.id])
        : commitUpdate(
            update,
            (current: any) => markNotificationsRead(current, { role, id: self, ids: [note.id] }),
            notify,
            '',
          );
      if (result && typeof (result as Promise<unknown>).catch === 'function')
        void (result as Promise<unknown>).catch((error: any) =>
          notify(error?.message || 'Could not mark this notification as read.'),
        );
    }
    followDetail(go, 'dashboard/notifications', path);
  }

  const reading = !!active && (!narrow || !!selected);
  const viewerName =
    role === 'customer'
      ? customerIdentityLabel(data.settings?.name)
      : merchantIdentityLabel(data.profile?.name);

  return (
    <div className={'inbox' + (reading && narrow ? ' is-reading' : '')}>
      <Card as="section" className="dash-panel inbox-list">
        <div className="panel-title">
          <h2>Your updates</h2>
          <button
            className="text-link"
            type="button"
            onClick={() =>
              connected
                ? connected.mark(notes.filter((n: any) => !n.read).map((n: any) => n.id))
                : commitUpdate(
                    update,
                    (current: any) =>
                      markNotificationsRead(current, { role, id: self, ids: 'all' }),
                    notify,
                    '',
                  )
            }
          >
            Mark all as read
          </button>
        </div>
        <label className="search-input">
          <Search size={16} aria-hidden="true" />
          <span className="visually-hidden">Search updates</span>
          <input
            aria-label="Search updates"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="inbox-filters" role="toolbar" aria-label="Notification filters">
          {groups.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'selected' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {threads.length ? (
          <div className="inbox-threads">
            {threads.map((thread) => {
              const unread = thread.items.some((item: any) => item.read !== true);
              const job = (data.jobs || []).find(
                (item: any) => item.id === thread.latest.bookingId,
              );
              const Icon = icons[notificationLabel(thread.latest.type)] || Bell;
              return (
                <button
                  key={thread.key}
                  type="button"
                  className={
                    'inbox-thread' +
                    (thread.key === selected ? ' selected' : '') +
                    (unread ? ' unread' : '')
                  }
                  onClick={() => openThread(thread.key)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>
                    <b>{thread.latest.title || 'Update'}</b>
                    <small>
                      {job ? bookingReference(job) : notificationLabel(thread.latest.type)}
                      {thread.latest.createdAt ? ` · ${formatWhen(thread.latest.createdAt)}` : ''}
                    </small>
                  </span>
                  {unread ? <i aria-label="Unread" /> : null}
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
      <Card as="section" className="dash-panel inbox-detail">
        {narrow ? (
          <button type="button" className="detail-back" onClick={() => setSelected('')}>
            Back to notifications
          </button>
        ) : null}
        {active ? (
          <>
            <div className="panel-title">
              <h2>{active.latest.title || 'Update'}</h2>
              <button
                className="text-link"
                type="button"
                onClick={() =>
                  connected
                    ? connected.mark(active.items.map((n: any) => n.id))
                    : commitUpdate(
                        update,
                        (current: any) =>
                          markNotificationsRead(current, {
                            role,
                            id: self,
                            ids: active.items.map((item: any) => item.id),
                          }),
                        notify,
                        '',
                      )
                }
              >
                Mark as read
              </button>
            </div>
            {groupByDay(active.items).map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                {group.items.map((note: any) => {
                  const Icon = icons[notificationLabel(note.type)] || Bell;
                  const destination = connected
                    ? connected.destination(note)
                    : notificationDestination(data, role, note);
                  return (
                    <article key={note.id} className={'inbox-item' + (note.read ? '' : ' unread')}>
                      <Icon size={16} aria-hidden="true" />
                      <div>
                        <b>{note.title || 'Update'}</b>
                        <p>{note.message || note.text}</p>
                        <small>
                          {note.createdAt ? formatWhen(note.createdAt) : 'Date not recorded'}
                        </small>
                        {destination ? (
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => openDestination(note)}
                          >
                            Open
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
            {!connected &&
            role !== 'admin' &&
            active.latest.type === 'message' &&
            active.latest.bookingId ? (
              <JobConversation
                active
                bookingId={active.latest.bookingId}
                data={data}
                job={(data.jobs || []).find((item: any) => item.id === active.latest.bookingId)}
                notify={notify}
                update={update}
                viewerId={self}
                viewerName={viewerName}
                viewerRole={role}
              />
            ) : null}
          </>
        ) : (
          <p>Select an update to read it.</p>
        )}
      </Card>
    </div>
  );
}

function groupByDay(items: any[]) {
  const order = ['Today', 'Yesterday'];
  const groups = new Map<string, any[]>();
  const chronological = items
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  for (const item of chronological) {
    const label = notificationDay(item.createdAt);
    groups.set(label, [...(groups.get(label) || []), item]);
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (a[0] === 'Date not recorded') return 1;
      if (b[0] === 'Date not recorded') return -1;
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return String(b[1][0]?.createdAt || '').localeCompare(String(a[1][0]?.createdAt || ''));
    })
    .map(([label, groupItems]) => ({ label, items: groupItems }));
}
