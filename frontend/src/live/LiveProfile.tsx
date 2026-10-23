import { AdminProfilePage } from '../pages/admin/AdminProfilePage';
import { MerchantProfilePage } from '../pages/mechanic/MerchantProfilePage';
import { VerificationPage } from '../pages/mechanic/VerificationPage';
import { DocumentsPage } from '../pages/mechanic/DocumentsPage';
import { BusinessProfilePage } from '../pages/mechanic/BusinessProfilePage';
import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { SettingsPage } from '../pages/shared/SettingsPage';
import { WorkspaceHeading } from './LiveWorkspaceViews';
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
        <AdminProfilePage
          data={{ adminAccount: user }}
          section={tab === 'platform' ? 'platform' : 'account'}
          route={(path: string) => setTab(path.split('/')[1])}
          connected={{
            save: (values: any) =>
              run(async () => {
                onUser(
                  await api('/auth/profile', 'PATCH', {
                    ...values,
                    phone: user.phone,
                    photo: user.photo,
                  }),
                );
              }, 'Profile saved.'),
            platform: (
              <Card as="section" className="dash-panel settings-form profile-tab-panel">
                <h2>Pilot configuration</h2>
                <p className="muted">
                  Security, email delivery and payment configuration are managed by the server
                  environment. Changes to these settings are not available from this interface yet.
                </p>
              </Card>
            ),
          }}
        />
      </>
    );
  const profile = {
    ...pro,
    name: pro?.name || user.name,
    photo: user.photo,
    bio: pro?.about || '',
    services: pro?.services || [],
  };
  const verification =
    (
      {
        SUBMITTED: 'Pending review',
        CHANGES_REQUESTED: 'Changes requested',
        APPROVED: 'Approved',
        SUSPENDED: 'Suspended',
      } as Record<string, string>
    )[pro?.status] || 'Draft';
  const evidence = (docs || []).map((d: any) => ({
    ...d,
    kind:
      d.kind === 'IDENTITY'
        ? 'Identity evidence'
        : d.kind === 'QUALIFICATION'
          ? 'Qualifications / experience'
          : d.kind,
  }));
  const profileData = {
    profile,
    documents: evidence,
    application: { status: verification, note: pro?.reviewNote },
  };
  const route = (path: string) => setTab(path.split('/')[1]);
  return (
    <MerchantProfilePage
      data={profileData}
      profile={profile}
      section={
        ['business', 'documents', 'banking', 'verification'].includes(tab) ? tab : 'business'
      }
      route={route}
      connected={{
        savePhoto: async (photo: string) =>
          run(
            async () => {
              onUser(
                await api('/auth/profile', 'PATCH', { name: user.name, phone: user.phone, photo }),
              );
            },
            photo ? 'Photo saved.' : 'Photo removed.',
          ),
        business: error ? (
          <p role="alert">{error}</p>
        ) : !pro ? (
          <RoadLoader label="Loading business profile…" />
        ) : (
          <>
            <ConnectedBusinessProfile
              key={pro.id + ':' + pro.version}
              pro={pro}
              user={user}
              run={run}
              refresh={refresh}
              setTab={setTab}
            />
            <details className="fold">
              <summary>Account &amp; security</summary>
              {account}
            </details>
          </>
        ),
        documents: (
          <DocumentsPage
            data={{
              documents: (docs || []).map((d: any) => ({
                ...d,
                date: new Date(d.createdAt).toLocaleDateString(),
              })),
            }}
            route={(route: string) => setTab(route.split('/')[1])}
            connected={{
              remove: (id: string) =>
                run(async () => {
                  await api('/documents/' + id, 'DELETE');
                  refresh();
                }, 'Document removed.'),
            }}
            upload={(event: any) => {
              const file = event.target.files?.[0];
              const kind = document.querySelector<HTMLSelectElement>('#document-kind')?.value;
              event.target.value = '';
              if (!file) return;
              const body = new FormData();
              body.set('file', file);
              body.set('kind', kind || 'IDENTITY');
              void run(async () => {
                await api('/documents', 'POST', body);
                refresh();
              }, 'Document uploaded privately.');
            }}
          />
        ),
        banking: (
          <Card as="section" className="dash-panel settings-form">
            <h2>Banking details</h2>
            <p className="muted">
              Secure payout onboarding is not connected yet. Bank details will be collected through
              the payment provider when it is available.
            </p>
          </Card>
        ),
        verification: (
          <VerificationPage
            data={profileData}
            profile={profile}
            route={route}
            connected={{
              canSubmit: !!(
                pro?.phone &&
                pro?.about &&
                pro?.name &&
                pro?.services?.length &&
                docs?.some((d: any) => d.kind === 'IDENTITY') &&
                docs?.some((d: any) => d.kind === 'QUALIFICATION')
              ),
              submit: () =>
                run(async () => {
                  await api('/professional/me/submit', 'POST', {});
                  refresh();
                }, 'Application sent for review.'),
            }}
          />
        ),
      }}
    />
  );
}

function ConnectedBusinessProfile({ pro, user, run, refresh, setTab }: any) {
  const [profile, setProfile] = useState({ ...pro, bio: pro.about });
  return (
    <BusinessProfilePage
      profile={profile}
      setProfile={setProfile}
      initialEmail={user.email}
      route={(route: string) => setTab(route.split('/')[1])}
      connected={{
        save: (values: any) =>
          run(async () => {
            await api('/professional/me', 'PATCH', {
              name: values.name,
              type: values.type,
              city: values.city,
              address: values.address,
              phone: values.phone,
              website: values.website,
              about: values.bio,
              services: values.services,
              latitude: values.latitude === '' ? null : values.latitude,
              longitude: values.longitude === '' ? null : values.longitude,
              version: pro.version,
            });
            refresh();
          }, 'Business profile saved for review.'),
      }}
    />
  );
}
