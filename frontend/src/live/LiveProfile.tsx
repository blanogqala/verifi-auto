import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { DetailTabs, DetailPanel } from '../components/ui/DetailTabs';
import { StatusBadge } from '../components/ui/StatusBadge';
import { readProfilePhoto } from '../features/account/profilePhoto';
import { SettingsPage } from '../pages/shared/SettingsPage';
import { WorkspaceHeading } from './LiveWorkspaceViews';
import { DetailCard } from '../components/ui/DetailChrome';
import { RoadLoader } from '../components/ui/RoadLoader';
import { api, type LiveUser } from './api';
import { useResource } from './useResource';
export function LiveProfile({
  user,
  section,
  run,
  revision,
  refresh,
  onUser,
}: {
  user: LiveUser;
  section?: string;
  run: any;
  revision: number;
  refresh: () => void;
  onUser: any;
}) {
  const [tab, setTab] = useState(section?.split('/')[1] || 'business');
  useEffect(() => {
    setTab(section?.split('/')[1] || 'business');
  }, [section]);
  const { data: pro, error } = useResource(
    user.role === 'MECHANIC' && user.verifiedAt ? '/professional/me' : null,
    revision,
  );
  const { data: docs } = useResource(user.role === 'MECHANIC' ? '/documents' : null, revision);
  const account = (
    <SettingsPage
      key={user.id}
      data={{ settings: user }}
      connected={{
        save: async (values: any) => {
          onUser(await api('/auth/profile', 'PATCH', values));
          await run(async () => {}, 'Profile saved.');
        },
        changePassword: async (values: any) => {
          await api('/auth/password', 'POST', values);
          onUser(null);
          location.hash = 'login';
          await run(async () => {}, 'Password changed. Sign in again.');
        },
      }}
    />
  );
  if (user.role === 'CUSTOMER')
    return (
      <>
        <WorkspaceHeading title="Profile" />
        {account}
      </>
    );
  if (user.role === 'ADMIN')
    return (
      <>
        <WorkspaceHeading title="Admin profile" />
        <DetailTabs
          id="admin-profile"
          label="Admin profile sections"
          value={tab === 'platform' ? 'platform' : 'account'}
          onChange={setTab}
          tabs={[
            { id: 'account', label: 'Profile' },
            { id: 'platform', label: 'Platform settings' },
          ]}
        />
        {tab === 'platform' ? (
          <DetailCard title="Platform settings">
            <p>
              Security, email delivery and payment configuration are managed by the server
              environment. Changes to these settings are not available from this interface yet.
            </p>
          </DetailCard>
        ) : (
          account
        )}
      </>
    );
  return (
    <div className="merchant-profile mechanic-profile">
      <Card className="dash-panel merchant-summary mechanic-summary">
        <div className="avatar-upload">
          <label className="avatar big avatar-picker" aria-label="Upload profile photo">
            {user.photo ? (
              <img src={user.photo} alt="" />
            ) : (
              user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
            )}
            <input
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file)
                  void run(async () => {
                    const photo = await readProfilePhoto(file);
                    onUser(
                      await api('/auth/profile', 'PATCH', {
                        name: user.name,
                        phone: user.phone,
                        photo,
                      }),
                    );
                  }, 'Photo saved.');
              }}
            />
          </label>
        </div>
        <div className="merchant-summary-copy">
          <h1>Mechanic profile</h1>
          <p className="mechanic-trade">{pro?.name || user.name}</p>
          <p>{pro?.type || 'Professional'}</p>
          <StatusBadge value={pro?.status?.toLowerCase().replaceAll('_', ' ') || 'Draft'} />
        </div>
      </Card>
      <DetailTabs
        id="mechanic-profile"
        label="Profile sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'business', label: 'Business profile' },
          { id: 'documents', label: 'Documents' },
          { id: 'banking', label: 'Bank account details' },
          { id: 'verification', label: 'Verification status' },
          { id: 'account', label: 'Account & security' },
        ]}
      />
      <DetailPanel scope="mechanic-profile" tabId="account" value={tab}>
        {account}
      </DetailPanel>
      <DetailPanel scope="mechanic-profile" tabId="banking" value={tab}>
        <DetailCard title="Bank account details">
          <p>
            Secure payout onboarding is not connected yet. Bank details will be collected through
            the payment provider when it is available.
          </p>
        </DetailCard>
      </DetailPanel>
      <DetailPanel scope="mechanic-profile" tabId="verification" value={tab}>
        <DetailCard title="Verification status">
          <StatusBadge value={pro?.status || 'Draft'} />
          <p>
            {pro?.reviewNote ||
              'Complete your business profile and upload supporting documents before submitting for review.'}
          </p>
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
      </DetailPanel>
      {user.role === 'MECHANIC' ? (
        error ? (
          <p role="alert">{error}</p>
        ) : !pro ? (
          <RoadLoader label="Loading business profile…" />
        ) : (
          <>
            <DetailPanel scope="mechanic-profile" tabId="business" value={tab}>
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
            </DetailPanel>
            <DetailPanel scope="mechanic-profile" tabId="documents" value={tab}>
              <DetailCard title="Verification documents">
                <p>
                  Identity and qualification evidence are required for this initial review workflow.
                  PDF, JPEG or PNG; up to 5 MB each.
                </p>
                {docs?.map((doc: any) => (
                  <div className="document-row" key={doc.id}>
                    <div>
                      <b>{doc.kind}</b>
                      <small>{doc.name}</small>
                    </div>
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
            </DetailPanel>
          </>
        )
      ) : null}
    </div>
  );
}
