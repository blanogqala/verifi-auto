import { Card } from '../../components/ui/Card';

import { Check, Bell } from 'lucide-react';
import { commitUpdate } from '../../features/demo/commitUpdate';

/** Presentational view. State and actions are supplied by the owning layout. */
export function NotificationsPage({ data, notify = () => {}, update }: any) {
  return (
    <Card as="section" className="dash-panel">
      <div className="panel-title">
        <h2>Your updates</h2>
        <button
          className="text-link"
          onClick={() =>
            commitUpdate(
              update,
              (d: any) => ({
                ...d,
                notifications: d.notifications.map((n: any) => ({ ...n, read: true })),
              }),
              notify,
              '',
            )
          }
        >
          Mark all as read <Check size={16} />
        </button>
      </div>
      {data.notifications.map((n: any) => (
        <button
          className={'notification-row ' + (!n.read ? 'unread' : '')}
          key={n.id}
          onClick={() =>
            commitUpdate(
              update,
              (d: any) => ({
                ...d,
                notifications: d.notifications.map((x: any) =>
                  x.id === n.id ? { ...x, read: true } : x,
                ),
              }),
              notify,
              '',
            )
          }
        >
          <span>
            <Bell size={18} />
          </span>
          <div>
            <p>{n.text}</p>
            <small>{n.read ? 'Read' : 'New update'} · Demo activity</small>
          </div>
          {!n.read && <i />}
        </button>
      ))}
    </Card>
  );
}
