import { Card } from '../../components/ui/Card';

import { Check, LogOut } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function SettingsPage({ data, logout, name, notify, role, update }: any) {
  const customer = role === 'customer';
  return (
    <Card
      as="form"
      className="dash-panel settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget as HTMLFormElement);
        if (role === 'admin') {
          update((d: any) => ({
            ...d,
            platform: {
              pilot: f.get('pilot'),
              applicationsOpen: f.get('applicationsOpen') === 'on',
            },
          }));
          notify('Demo settings saved in this browser.');
        } else if (customer) {
          update((d: any) => ({
            ...d,
            settings: {
              ...d.settings,
              name: String(f.get('name') || '').trim(),
              email: String(f.get('email') || '').trim(),
              emailUpdates: f.get('emailUpdates') === 'on',
            },
          }));
          notify('Demo profile saved in this browser.');
        } else {
          update((d: any) => ({
            ...d,
            settings: {
              ...d.settings,
              name: f.get('name'),
              email: f.get('email'),
              emailUpdates: f.get('emailUpdates') === 'on',
            },
          }));
          notify('Demo settings saved in this browser.');
        }
      }}
    >
      <h2>
        {role === 'admin' ? 'Pilot configuration' : customer ? 'Profile' : 'Your account details'}
      </h2>
      <p className="muted">
        {customer
          ? 'Use sample details. This profile stays in this browser and does not create a real account or send notifications.'
          : 'Use sample details. Settings do not create a real account or send notifications.'}
      </p>
      {role === 'admin' ? (
        <>
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
        </>
      ) : (
        <>
          <div className="form-row">
            <label>
              {customer ? 'Full name' : 'Display name'}
              <input name="name" required defaultValue={data.settings.name} />
            </label>
            <label>
              Email address
              <input name="email" type="email" required defaultValue={data.settings.email} />
            </label>
          </div>
          <label className="check-label">
            <input
              name="emailUpdates"
              type="checkbox"
              defaultChecked={data.settings.emailUpdates}
            />
            Email updates preference
          </label>
        </>
      )}
      <button className="primary" type="submit">
        {customer ? 'Save profile' : 'Save settings'} <Check size={17} />
      </button>
      <div className="settings-divider">
        <h3>Explore another workspace</h3>
        <p className="muted">
          Sign out to switch between customer, mechanic, and admin previews. Your sample data stays
          in this browser.
        </p>
        <button className="secondary" type="button" onClick={logout}>
          Sign out / switch preview <LogOut size={16} />
        </button>
      </div>
    </Card>
  );
}
