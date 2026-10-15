import type { KeyboardEvent } from 'react';
import { Check, LogOut, Settings, UserRound } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import {
  adminProfileSectionLabel,
  type AdminProfileSection,
} from '../../config/navigation';

const tabs: { id: AdminProfileSection; label: string; target: string; Icon: typeof UserRound }[] = [
  { id: 'account', label: adminProfileSectionLabel.account, target: 'profile/account', Icon: UserRound },
  {
    id: 'platform',
    label: adminProfileSectionLabel.platform,
    target: 'profile/platform',
    Icon: Settings,
  },
];

/** Admin identity and pilot settings. Stored apart from customer and mechanic accounts. */
export function AdminProfilePage({ data, logout, notify, route, section, update }: any) {
  const account = data.adminAccount || {};

  function select(next: AdminProfileSection) {
    const tab = tabs.find((item) => item.id === next);
    if (tab && next !== section) route(tab.target);
  }

  function onTabsKey(event: KeyboardEvent<HTMLDivElement>) {
    const ids = tabs.map((tab) => tab.id);
    const index = Math.max(0, ids.indexOf(section));
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;
    else return;
    event.preventDefault();
    select(ids[nextIndex]);
    document.getElementById('admin-tab-' + ids[nextIndex])?.focus();
  }

  return (
    <div className="admin-profile">
      <div
        className="profile-tablist"
        role="tablist"
        aria-label="Admin profile"
        onKeyDown={onTabsKey}
      >
        {tabs.map((tab) => {
          const selected = section === tab.id;
          return (
            <button
              key={tab.id}
              id={'admin-tab-' + tab.id}
              type="button"
              role="tab"
              className={selected ? 'selected' : ''}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
            >
              <tab.Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {section === 'platform' ? (
        <Card
          as="form"
          className="dash-panel settings-form profile-tab-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget as HTMLFormElement);
            update((current: any) => ({
              ...current,
              platform: {
                pilot: form.get('pilot'),
                applicationsOpen: form.get('applicationsOpen') === 'on',
              },
            }));
            notify('Demo settings saved in this browser.');
          }}
        >
          <h2>Pilot configuration</h2>
          <p className="muted">
            Use sample details. Settings do not create a real account or send notifications.
          </p>
          <label>
            Pilot city
            <select name="pilot" defaultValue={data.platform.pilot}>
              <option>Undecided</option>
              <option>East London</option>
              <option>Johannesburg</option>
            </select>
          </label>
          <label className="check-label">
            <input
              name="applicationsOpen"
              type="checkbox"
              defaultChecked={data.platform.applicationsOpen}
            />
            Mark applications open in the demo configuration
          </label>
          <div className="notice">
            This setting is illustrative and does not open public applications.
          </div>
          <button className="primary" type="submit">
            Save settings <Check size={17} />
          </button>
          <div className="settings-divider">
            <h3>Explore another workspace</h3>
            <p className="muted">
              Sign out to switch between customer, mechanic, and admin previews. Your sample data
              stays in this browser.
            </p>
            <button className="secondary" type="button" onClick={logout}>
              Sign out / switch preview <LogOut size={16} />
            </button>
          </div>
        </Card>
      ) : (
        <Card
          as="form"
          className="dash-panel settings-form profile-tab-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget as HTMLFormElement);
            update((current: any) => ({
              ...current,
              adminAccount: {
                name: String(form.get('name') || '').trim(),
                email: String(form.get('email') || '').trim(),
              },
            }));
            notify('Demo profile saved in this browser.');
          }}
        >
          <h2>Profile</h2>
          <p className="muted">
            This admin profile stays in this browser. It is separate from customer and mechanic
            accounts.
          </p>
          <div className="form-row">
            <label>
              Full name
              <input name="name" required defaultValue={account.name || ''} />
            </label>
            <label>
              Email address
              <input name="email" type="email" required defaultValue={account.email || ''} />
            </label>
          </div>
          <button className="primary" type="submit">
            Save profile <Check size={17} />
          </button>
        </Card>
      )}
    </div>
  );
}
