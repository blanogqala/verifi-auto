import {
  ApplicationDetailPage,
  ProfessionalAdminDetailPage,
  CustomerAdminDetailPage,
} from '../pages/admin/AdminDetailPages';
import { useEffect, useState } from 'react';
import { Users, ShieldCheck, ClipboardCheck, Car, Wallet, Wrench } from 'lucide-react';
import { DetailCard, DetailBack, DetailFields, DetailHeader } from '../components/ui/DetailChrome';
import { DetailTabs, DetailPanel } from '../components/ui/DetailTabs';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OverviewPage } from '../pages/shared/OverviewPage';
import { ApplicationsPage } from '../pages/admin/ApplicationsPage';
import { CustomersPage } from '../pages/admin/CustomersPage';
import { ProfessionalsAdminPage } from '../pages/admin/ProfessionalsAdminPage';
import { SecurityActivityPage } from '../pages/admin/SecurityActivityPage';
import { StatusChart, CityChart } from '../pages/admin/AdminCharts';
import { WorkspaceHeading, bookingCardData } from './LiveWorkspaceViews';
import { api, apiBase, displayStatus, money } from './api';
import { RoadLoader } from '../components/ui/RoadLoader';
import { useResource } from './useResource';
const status = (s: string) =>
  ({
    SUBMITTED: 'Pending review',
    APPROVED: 'Approved',
    SUSPENDED: 'Suspended',
    CHANGES_REQUESTED: 'Changes requested',
    DRAFT: 'Draft',
  })[s] || s;
const application = (p: any) => ({
  ...p,
  status: status(p.status),
  date: new Date(p.updatedAt).toLocaleDateString(),
  note: p.reviewNote,
  sample: false,
});
export function LiveAdmin({ section, revision, run, go, refresh }: any) {
  const [base, resourceId] = section.split('/');
  const history = resourceId === 'history';
  const detail =
    !!resourceId && !history && ['applications', 'professionals', 'customers'].includes(base);
  const [checks, setChecks] = useState<string[]>([]);
  const [reviewNote, setReviewNote] = useState('');
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All'),
    [tab, setTab] = useState('overview');
  useEffect(() => {
    setChecks([]);
    setReviewNote('');
  }, [base, resourceId]);
  const { data, error } = useResource(
    detail
      ? (base === 'customers' ? '/admin/users/' : '/admin/professionals/') + resourceId
      : base === 'applications'
        ? history
          ? '/admin/application-history?take=100'
          : '/admin/applications?take=100'
        : base === 'customers'
          ? '/admin/users?role=CUSTOMER&take=100'
          : base === 'professionals'
            ? '/admin/professionals?take=100'
            : '/admin/overview',
    revision,
  );
  const { data: jobs, error: jobsError } = useResource('/bookings?take=100', revision);
  const { data: apps } = useResource(
    base === 'overview' ? '/admin/applications?take=100' : null,
    revision,
  );
  const { data: activity, error: activityError } = useResource(
    base === 'reports' ? '/admin/activity?take=100' : null,
    revision,
  );
  const { data: payments } = useResource(
    base === 'professionals' || detail ? '/payments' : null,
    revision,
  );
  const route = (p: string) => go('dashboard/' + p);
  if (error || jobsError)
    return (
      <DetailCard title="Could not load administration">
        <p role="alert">{error || jobsError}</p>
      </DetailCard>
    );
  if (!data || !jobs) return <RoadLoader label="Loading administration…" />;
  const mappedJobs = jobs.map((j: any) => ({
    ...bookingCardData(j),
    customerId: j.customerId,
    professionalId: j.professionalId,
  }));
  const linked = detail
    ? jobs.filter((j: any) =>
        base === 'customers' ? j.customerId === data.id : j.professionalId === data.id,
      )
    : [];
  const linkedPayments = (payments || []).filter(
    (p: any) => p.provider !== 'TEST' && linked.some((j: any) => j.id === p.quote.bookingId),
  );
  if (detail && base === 'applications')
    return (
      <ApplicationDetailPage
        key={data.id}
        record={{
          ...application(data),
          bio: data.about,
          email: data.user?.email,
          individualName: data.user?.name,
          documents: (data.user?.documents || []).map((d: any) => ({
            ...d,
            kind: displayStatus(d.kind),
          })),
        }}
        data={{ adminActivity: [] }}
        route={route}
        checks={checks}
        setChecks={setChecks}
        reviewNote={reviewNote}
        setReviewNote={setReviewNote}
        connected={{ documentUrl: (id: string) => `${apiBase}/api/documents/${id}` }}
        review={(_: any, decision: string) =>
          run(async () => {
            if (reviewNote.trim().length < 3)
              throw new Error('Add decision notes of at least 3 characters.');
            await api(`/admin/professionals/${data.id}/review`, 'POST', {
              status: (
                {
                  Approved: 'APPROVED',
                  'Changes requested': 'CHANGES_REQUESTED',
                  Suspended: 'SUSPENDED',
                } as any
              )[decision],
              note: reviewNote,
              version: data.version,
            });
            setChecks([]);
            setReviewNote('');
            refresh();
          }, 'Application decision saved.')
        }
      />
    );
  if (detail) {
    const recentReviews = (data.reviews || []).map((r: any) => ({ ...r, text: r.body }));
    const connected = {
      jobs: linked.map(bookingCardData),
      paid: linkedPayments.reduce((n: number, p: any) => n + p.amountCents, 0) / 100,
      reviews: recentReviews,
      rating: {
        count: recentReviews.length,
        average: recentReviews.length
          ? (
              recentReviews.reduce((n: number, r: any) => n + r.rating, 0) / recentReviews.length
            ).toFixed(1)
          : 0,
      },
      accountAction: (
        <button
          className="secondary"
          onClick={() =>
            run(async () => {
              await api('/admin/users/' + data.id + '/status', 'POST', {
                disabled: !data.disabledAt,
              });
              refresh();
            }, 'Account status updated.')
          }
        >
          {data.disabledAt ? 'Enable account' : 'Disable account'}
        </button>
      ),
    };
    return base === 'customers' ? (
      <CustomerAdminDetailPage
        key={data.id}
        customer={data}
        data={{}}
        route={route}
        connected={connected}
      />
    ) : (
      <ProfessionalAdminDetailPage
        key={data.id}
        record={{
          ...application(data),
          professionalId: data.id,
          email: data.user?.email,
          bio: data.about,
        }}
        data={{}}
        route={route}
        connected={connected}
      />
    );
  }
  if (base === 'applications')
    return (
      <>
        <WorkspaceHeading title={history ? 'Application history' : 'Applications'} />
        <ApplicationsPage
          live
          apps={data.map(application)}
          history={history}
          query={query}
          setQuery={setQuery}
          route={route}
          openReview={(p: any) => route('applications/' + p.id)}
        />
        <p className="muted">Showing up to 100 recent applications.</p>
      </>
    );
  if (base === 'customers')
    return (
      <>
        <WorkspaceHeading title="Customers" />
        <CustomersPage
          live
          customers={data}
          jobs={mappedJobs}
          query={query}
          setQuery={setQuery}
          setDialog={({ customer }: any) => route('customers/' + customer.id)}
        />
        <p className="muted">
          Summary covers the loaded accounts and recent bookings (up to 100 each).
        </p>
      </>
    );
  if (base === 'professionals')
    return (
      <>
        <WorkspaceHeading title="Professionals" />
        <ProfessionalsAdminPage
          live
          apps={data.map(application)}
          data={{ jobs: mappedJobs }}
          revenueCents={(payments || [])
            .filter((p: any) => p.provider !== 'TEST')
            .reduce((n: number, p: any) => n + p.amountCents, 0)}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          openReview={(p: any) => route('professionals/' + p.id)}
        />
        <p className="muted">
          Summary covers the loaded professionals and recent payments (up to 100 each).
        </p>
      </>
    );
  const total = data.bookings.reduce((n: number, r: any) => n + r._count, 0);
  const active = data.bookings
    .filter((r: any) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status))
    .reduce((n: number, r: any) => n + r._count, 0);
  if (base === 'reports') {
    const cities = new Map<string, number>();
    jobs.forEach((j: any) =>
      cities.set(
        j.professional.city || 'Not recorded',
        (cities.get(j.professional.city || 'Not recorded') || 0) + 1,
      ),
    );
    return (
      <>
        <WorkspaceHeading title="Analytics & support" />
        <DetailTabs
          id="analytics"
          label="Analytics sections"
          value={resourceId === 'security' ? 'security' : 'overview'}
          onChange={(t) => route(t === 'security' ? 'reports/security' : 'reports')}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'security', label: 'Security & activity' },
          ]}
        />
        {resourceId === 'security' ? (
          activityError ? (
            <p role="alert">{activityError}</p>
          ) : !activity ? (
            <RoadLoader label="Loading audit trail…" />
          ) : (
            <SecurityActivityPage
              live
              data={{
                adminActivity: activity.map((e: any) => ({
                  ...e,
                  at: e.createdAt,
                  actor: e.actorId || 'System',
                  action: displayStatus(e.action),
                  target: e.resourceId,
                  role: 'Not recorded',
                })),
              }}
            />
          )
        ) : (
          <div className="admin-overview">
            <div className="metrics">
              {[
                [Users, 'Total customers', data.customers],
                [ShieldCheck, 'Approved professionals', data.professionals],
                [ClipboardCheck, 'Pending applications', data.applications],
                [Car, 'Total bookings', total],
                [Wrench, 'Active jobs', active],
                [Wallet, 'Confirmed payments', money(data.confirmedPaymentCents)],
              ].map(([Icon, label, value]: any) => (
                <MetricCard
                  key={label}
                  label={label}
                  value={value}
                  note="Server records"
                  Icon={Icon}
                />
              ))}
            </div>
            <div className="admin-detail-grid">
              <DetailCard title="Bookings by status">
                <StatusChart
                  label="Bookings by status"
                  rows={data.bookings.map((r: any) => [displayStatus(r.status), r._count])}
                />
              </DetailCard>
              <DetailCard title="Bookings by professional city">
                <CityChart label="Bookings by professional city" rows={[...cities.entries()]} />
                <p className="muted">
                  Recent 100 bookings. Customer home cities are not collected.
                </p>
              </DetailCard>
            </div>
          </div>
        )}
      </>
    );
  }
  return (
    <>
      <WorkspaceHeading title="Platform overview" />
      <OverviewPage
        live
        role="admin"
        apps={(apps || []).map(application)}
        jobs={mappedJobs}
        data={{ reports: [] }}
        summary={{ ...data, activeJobs: active }}
        route={route}
        openReview={(p: any) => route('applications/' + p.id)}
      />
    </>
  );
}
