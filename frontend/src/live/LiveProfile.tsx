import { SettingsPage } from '../pages/shared/SettingsPage';
import { WorkspaceHeading } from './LiveWorkspaceViews';
import { DetailCard } from '../components/ui/DetailChrome';
import { RoadLoader } from '../components/ui/RoadLoader';
import { api, type LiveUser } from './api';
import { useResource } from './useResource';
export function LiveProfile({
  user,
  run,
  revision,
  refresh,
  onUser,
}: {
  user: LiveUser;
  run: any;
  revision: number;
  refresh: () => void;
  onUser: any;
}) {
  const { data: pro, error } = useResource(
    user.role === 'MECHANIC' && user.verifiedAt ? '/professional/me' : null,
    revision,
  );
  const { data: docs } = useResource(user.role === 'MECHANIC' ? '/documents' : null, revision);
  if (user.role === 'CUSTOMER') {
    return (
      <>
        <WorkspaceHeading title="Profile" />
        <SettingsPage
          key={user.id}
          data={{ settings: user }}
          connected={{
            save: async (values: {
              name: string;
              phone: string;
              photo: string;
              emailUpdates: boolean;
            }) => {
              const saved = await api<LiveUser>('/auth/profile', 'PATCH', values);
              onUser(saved);
              await run(async () => {}, 'Profile saved.');
            },
            changePassword: async (values: { currentPassword: string; password: string }) => {
              await api('/auth/password', 'POST', values);
              onUser(null);
              location.hash = 'login';
              await run(async () => {}, 'Password changed. Sign in again.');
            },
          }}
        />
      </>
    );
  }
  return (
    <div className="detail-page">
      <h1>My profile</h1>
      <DetailCard title="Account details">
        <div className="avatar">
          {user.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </div>
        <form
          key={user.id}
          onSubmit={(event) => {
            event.preventDefault();
            const body = Object.fromEntries(new FormData(event.currentTarget));
            void run(
              async () => onUser(await api('/auth/profile', 'PATCH', body)),
              'Profile saved.',
            );
          }}
        >
          <label>
            Full name
            <input name="name" defaultValue={user.name} required minLength={2} maxLength={120} />
          </label>
          <label>
            Email
            <input value={user.email} readOnly type="email" />
          </label>
          <label>
            Cellphone
            <input name="phone" type="tel" defaultValue={user.phone} />
          </label>
          <button className="primary">Save profile</button>
        </form>
      </DetailCard>
      {user.role === 'MECHANIC' ? (
        error ? (
          <p role="alert">{error}</p>
        ) : !pro ? (
          <RoadLoader label="Loading business profile…" />
        ) : (
          <>
            <DetailCard title="Business profile">
              <p>Verification: {pro.status.toLowerCase().replaceAll('_', ' ')}</p>
              {pro.reviewNote ? <p>{pro.reviewNote}</p> : null}
              <form
                key={pro.version}
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = Object.fromEntries(new FormData(event.currentTarget));
                  void run(async () => {
                    await api('/professional/me', 'PATCH', {
                      ...values,
                      services: String(values.services)
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                      latitude: values.latitude === '' ? null : Number(values.latitude),
                      longitude: values.longitude === '' ? null : Number(values.longitude),
                      version: pro.version,
                    });
                    refresh();
                  }, 'Business profile saved for review.');
                }}
              >
                {['name', 'city', 'address', 'phone', 'website'].map((name) => (
                  <label key={name}>
                    {
                      (
                        {
                          name: 'Business / trade name',
                          city: 'City',
                          address: 'Business address',
                          phone: 'Telephone',
                          website: 'Website',
                        } as any
                      )[name]
                    }
                    <input
                      name={name}
                      type={name === 'website' ? 'url' : 'text'}
                      defaultValue={pro[name]}
                      required={['name', 'city'].includes(name)}
                    />
                  </label>
                ))}
                <label>
                  Professional type
                  <select name="type" defaultValue={pro.type}>
                    <option>Workshop</option>
                    <option>Mobile mechanic</option>
                  </select>
                </label>
                <label>
                  About
                  <textarea
                    name="about"
                    defaultValue={pro.about}
                    minLength={10}
                    maxLength={4000}
                    required
                  />
                </label>
                <label>
                  Services (separated by commas)
                  <input name="services" defaultValue={pro.services.join(', ')} required />
                </label>
                <details className="fold">
                  <summary>Map coordinates (optional)</summary>
                  <label>
                    Latitude
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      defaultValue={pro.latitude ?? ''}
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      defaultValue={pro.longitude ?? ''}
                    />
                  </label>
                </details>
                <p className="muted">
                  Changing business information requires a fresh review before your directory
                  listing is shown again.
                </p>
                <button className="primary">Save business profile</button>
              </form>
            </DetailCard>
            <DetailCard title="Verification documents">
              <p>
                Identity and qualification evidence are required for this initial review workflow.
                PDF, JPEG or PNG; up to 5 MB each.
              </p>
              {docs?.map((doc: any) => (
                <div className="button-row" key={doc.id}>
                  <span>
                    {doc.kind} · {doc.name}
                  </span>
                  <button
                    className="secondary"
                    onClick={() =>
                      run(async () => {
                        await api(`/documents/${doc.id}`, 'DELETE');
                        refresh();
                      }, 'Document removed.')
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const body = new FormData(form);
                  void run(async () => {
                    await api('/documents', 'POST', body);
                    form.reset();
                    refresh();
                  }, 'Document uploaded privately.');
                }}
              >
                <label>
                  Document type
                  <select name="kind">
                    <option value="IDENTITY">Identity</option>
                    <option value="QUALIFICATION">Qualification</option>
                    <option value="BUSINESS">Business registration</option>
                  </select>
                </label>
                <label>
                  File
                  <input
                    name="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    required
                  />
                </label>
                <button className="secondary">Upload document</button>
              </form>
              <button
                className="primary"
                onClick={() =>
                  run(async () => {
                    await api('/professional/me/submit', 'POST', {});
                    refresh();
                  }, 'Application sent for review.')
                }
              >
                Submit application
              </button>
            </DetailCard>
          </>
        )
      ) : null}
      <DetailCard title="Change password">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(event.currentTarget));
            void run(async () => {
              await api('/auth/password', 'POST', values);
              onUser(null);
              location.hash = 'login';
            }, 'Password changed. Sign in again.');
          }}
        >
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              pattern="(?=.*[0-9]).{8,128}"
              required
            />
          </label>
          <button className="primary">Change password</button>
        </form>
      </DetailCard>
    </div>
  );
}
