import { JobCard } from '../components/jobs/JobCard';
import { Card } from '../components/ui/Card';
import { WorkspaceSidebar } from '../layouts/WorkspaceSidebar';
import { WorkspaceTopbar } from '../layouts/WorkspaceTopbar';
import { WorkspaceDialog } from '../components/dialogs/WorkspaceDialog';
import { OverviewPage } from '../pages/shared/OverviewPage';
import { JobsPage } from '../pages/shared/JobsPage';
import { QuotesPage } from '../pages/shared/QuotesPage';
import { GaragePage } from '../pages/customer/GaragePage';
import { VehiclePage } from '../pages/customer/VehiclePage';
import { BookingDetailPage } from '../pages/customer/BookingDetailPage';
import { PaymentsPage } from '../pages/customer/PaymentsPage';
import { AppointmentsPage } from '../pages/mechanic/AppointmentsPage';
import { AppointmentDetailPage } from '../pages/mechanic/AppointmentDetailPage';
import { JobDetailPage } from '../pages/mechanic/JobDetailPage';
import { MechanicPaymentsPage } from '../pages/mechanic/MechanicPaymentsPage';
import { MerchantProfilePage } from '../pages/mechanic/MerchantProfilePage';
import { ApplicationsPage } from '../pages/admin/ApplicationsPage';
import { ProfessionalsAdminPage } from '../pages/admin/ProfessionalsAdminPage';
import { CustomersPage } from '../pages/admin/CustomersPage';
import { AnalyticsPage } from '../pages/admin/AnalyticsPage';
import { FinancePage } from '../pages/admin/FinancePage';
import { AdminProfilePage } from '../pages/admin/AdminProfilePage';
import { NotificationsPage } from '../pages/shared/NotificationsPage';
import { SettingsPage } from '../pages/shared/SettingsPage';
import { ProfessionalsPage } from '../pages/public/ProfessionalsPage';
import { ProfessionalProfilePage } from '../components/professionals/ProfessionalProfilePage';

import { StatusBadge as Status } from '../components/ui/StatusBadge';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  LayoutDashboard,
  Calendar,
  FileText,
  Car,
  Wallet,
  Bell,
  Settings,
  UserRound,
  Wrench,
  ShieldCheck,
  Upload,
  ClipboardCheck,
  Plus,
  AlertCircle,
  Users,
} from 'lucide-react';
import { customerFullName } from '../features/account/customerIdentity';
import { resolveVehicleAsset } from '../features/garage/assetResolution';
import { vehicleCardImage } from '../features/garage/garageSelection';
import {
  enterMechanicPreview,
  leaveMechanicPreview,
  mechanicPreviewActive,
  showcaseProfessionalId,
} from '../data/mechanicShowcase';
import { followDetail, readBookingFilters, writeBookingFilters } from '../features/navigation/returnPath';
import {
  Role,
  adminProfileSection,
  adminProfileSectionLabel,
  analyticsSection,
  applicationRecords,
  appointmentSection,
  customerRecords,
  bookingsForCustomer,
  customerNameForJob,
  jobsForMechanic,
  participantId,
  unreadNotificationCount,
  decideApplication,
  isAcceptedJob,
  isCancelledRequest,
  isPendingRequest,
  isRejectedRequest,
  activeMechanicProfessionalId,
  isManagedProfessional,
  isPendingApplication,
  isReviewHistory,
  merchantProfileSection,
  merchantProfileSectionLabel,
  pageTitle,
  applyJobTransition,
  commitUpdate,
  detailId,
  detailPanel,
  appointmentTarget,
  appendNotification,
} from '../demo';

export type DirectoryProps = {
  book: (professional: any) => void;
  city: string;
  results: any[];
  service: string;
  setCity: (value: string) => void;
  setModal: (value: any) => void;
  setService: (value: string) => void;
  setStep: (value: number) => void;
  setType: (value: string) => void;
  type: string;
};

const emptyDirectory: DirectoryProps = {
  book: () => {},
  city: 'All locations',
  results: [],
  service: 'All services',
  setCity: () => {},
  setModal: () => {},
  setService: () => {},
  setStep: () => {},
  setType: () => {},
  type: 'Either',
};

export type WorkspaceProps = {
  role: Role;
  tab: string;
  go: (page: string) => void;
  logout: () => void;
  data: any;
  update: (fn: (value: any) => any) => boolean | void;
  notify: (message: string) => void;
  theme?: string;
  setTheme?: (theme: string) => void;
  directory?: DirectoryProps;
};

export function Workspace({
  role,
  tab,
  go,
  logout,
  data,
  update,
  notify,
  theme = 'dark',
  setTheme = () => {},
  directory = emptyDirectory,
}: WorkspaceProps) {
  const [side, setSide] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [uploadError, setUploadError] = useState('');
  const [checks, setChecks] = useState<string[]>([]);
  const [reviewNote, setReviewNote] = useState('');
  const [profile, setProfile] = useState<any>(data.profile);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [previewing] = useState(mechanicPreviewActive);
  useEffect(() => {
    setDialog(null);
    const keepBookingList = role === 'customer' && (tab === 'bookings' || tab.startsWith('bookings/'));
    if (!keepBookingList) {
      setFilter('All');
      setQuery('');
      return;
    }
    if (tab === 'bookings') {
      const saved = readBookingFilters();
      setFilter(saved.filter);
      setQuery(saved.query);
    }
  }, [tab, role]);
  useEffect(() => {
    if (role === 'customer' && tab === 'bookings') writeBookingFilters(filter, query);
  }, [filter, query, role, tab]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 750px)');
    const sync = () => {
      setDrawer(media.matches);
      if (!media.matches) setSide(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!side || !drawer) return;
    const sidebar = document.getElementById('workspace-sidebar');
    sidebar?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSide(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const items = Array.from(
        sidebar.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex="0"]'),
      ).filter(
        (el) => !el.hasAttribute('disabled') && !el.closest('[hidden], [inert]'),
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (menuButtonRef.current && document.contains(menuButtonRef.current))
        menuButtonRef.current.focus();
    };
  }, [side, drawer]);
  useEffect(() => {
    if (!dialog) return;
    const before = document.activeElement as HTMLElement;
    const el = document.querySelector('.workspace-dialog') as HTMLElement;
    const fs = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]'),
      ).filter((e) => !e.hasAttribute('disabled') && !e.closest('[hidden],[inert]'));
    fs()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDialog(null);
      if (e.key === 'Tab') {
        const a = fs(),
          first = a[0],
          last = a[a.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, [dialog?.kind]);
  const jobs = data.jobs;
  const selfId = participantId(data, role);
  const unread = unreadNotificationCount(data, role, selfId);
  const scopedJobs =
    role === 'mechanic'
      ? jobsForMechanic(jobs, data)
      : role === 'customer'
        ? bookingsForCustomer(jobs, data.settings?.id || 'cust-01')
        : jobs;
  const accountName =
    role === 'customer'
      ? data.settings?.name
      : role === 'mechanic'
        ? data.profile?.name
        : data.adminAccount?.name;
  const customerName = customerFullName(role === 'customer' ? accountName : data.settings?.name);
  const merchantSection = role === 'mechanic' ? merchantProfileSection(tab) : null;
  const adminSection = role === 'admin' ? adminProfileSection(tab) : null;
  const analyticsView = role === 'admin' ? analyticsSection(tab) : null;
  const appointmentView = role === 'mechanic' ? appointmentSection(tab) : null;
  const sectionLabel = merchantSection
    ? merchantProfileSectionLabel[merchantSection]
    : adminSection
      ? adminProfileSectionLabel[adminSection]
      : analyticsView === 'support'
        ? 'Support cases'
        : analyticsView === 'analytics'
          ? 'Analytics'
          : tab === 'applications/history'
            ? 'Review history'
            : '';
  const name =
    role === 'customer'
      ? customerName.split(/\s+/)[0] || 'Customer'
      : role === 'mechanic'
        ? customerFullName(data.profile?.name) || 'Mechanic'
        : customerFullName(data.adminAccount?.name).split(/\s+/)[0] || 'Admin';
  const sectionRoot = tab.split('/')[0];
  const professionalId = detailId(tab, 'find');
  const bookingId = detailId(tab, 'bookings');
  const vehicleDetailId = detailId(tab, 'garage');
  const mechanicJobId = role === 'mechanic' ? detailId(tab, 'jobs') : undefined;
  const appointmentDetail = role === 'mechanic' ? appointmentTarget(tab) : undefined;
  const invalidDetail =
    professionalId === null || bookingId === null || vehicleDetailId === null || mechanicJobId === null || appointmentDetail === null;
  const hideFindCta =
    role === 'customer' && ['profile', 'settings', 'garage', 'payments'].includes(sectionRoot);
  const accountPhoto =
    role === 'customer' ? data.settings?.photo || '' : role === 'mechanic' ? data.profile?.photo || '' : '';
  const heading = pageTitle(role, tab);
  const apps = applicationRecords(data);
  const customers = customerRecords(data);
  function route(t: string) {
    go('dashboard/' + t);
    setSide(false);
  }
  function goHome() {
    setSide(false);
    go('home');
  }
  function note(d: any, text: string, audience?: { role: string; id: string }) {
    const recipientRole = audience?.role || (role === 'admin' ? 'admin' : role);
    const recipientId = audience?.id || participantId(d, recipientRole);
    return appendNotification(d, {
      recipientRole,
      recipientId,
      type: 'account',
      title: 'Update',
      message: text,
      section: recipientRole === 'admin' ? 'reports/support' : '',
    });
  }
  function actor() {
    if (role === 'mechanic') return { role: 'mechanic' as const, id: activeMechanicProfessionalId(data) };
    if (role === 'customer') return { role: 'customer' as const, id: data.settings?.id || 'cust-01' };
    return { role: 'admin' as const, id: 'admin' };
  }
  function jobAction(job: any, action: string, extra: any = {}) {
    let status = '';
    let duplicate = false;
    const saved = commitUpdate(
      update,
      (d: any) => {
        const result = applyJobTransition(d, job, action, extra, actor());
        status = result.job.status;
        duplicate = result.duplicate === true;
        return result.duplicate ? d : result.data;
      },
      notify,
      '',
    );
    if (!saved) return false;
    setDialog(null);
    if (!duplicate) notify('Demo job updated: ' + status);
    if (action === 'confirm') route('jobs/' + encodeURIComponent(job.id));
    if (action === 'reject') route('appointments/rejected/' + encodeURIComponent(job.id));
    return true;
  }
  function review(app: any, status: string) {
    if (status === 'Approved' && checks.length < 3) {
      notify('Complete all three review checks first.');
      return;
    }
    if (status !== 'Approved' && !reviewNote.trim()) {
      notify('Add a reason or requested changes first.');
      return;
    }
    const decision = decideApplication(app, status, reviewNote);
    const saved = commitUpdate(
      update,
      (d: any) =>
        note(
          app.own
            ? {
                ...d,
                application: {
                  ...d.application,
                  status: decision.status,
                  note: decision.note,
                  previouslyApproved: decision.previouslyApproved,
                },
              }
            : {
                ...d,
                reviews: d.reviews.map((a: any) =>
                  a.id === app.id
                    ? {
                        ...a,
                        status: decision.status,
                        note: decision.note,
                        previouslyApproved: decision.previouslyApproved,
                      }
                    : a,
                ),
              },
          `${app.name}: application ${status.toLowerCase()}.`,
        ),
      notify,
      '',
    );
    if (!saved) return;
    setDialog(null);
    notify('Demo application ' + status.toLowerCase());
  }
  function openReview(a: any) {
    setChecks([]);
    setReviewNote(a.note || '');
    setDialog({ kind: 'review', app: a });
  }
  function quoteEditor(j: any) {
    setEditItems(j.items?.length ? j.items.map((i: any) => ({ ...i })) : [{ name: '', amount: 0 }]);
    setQuoteNotes(j.notes || '');
    setDialog({ kind: 'quote-edit', job: j });
  }
  function upload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = (document.getElementById('document-kind') as HTMLSelectElement).value;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setUploadError('Choose a PDF, JPG, or PNG smaller than 10 MB.');
      e.target.value = '';
      return;
    }
    const saved = commitUpdate(
      update,
      (d: any) => ({
        ...d,
        documents: [
          ...d.documents.filter((x: any) => x.kind !== kind),
          {
            id: crypto.randomUUID(),
            kind,
            name: file.name,
            size: file.size,
            date: new Date().toISOString().split('T')[0],
          },
        ],
        application: { ...d.application, status: 'Draft' },
      }),
      notify,
      'Sample document selected. Only its name and size are saved in this browser.',
    );
    if (!saved) return;
    setUploadError('');
    e.target.value = '';
  }
  const cardJobs = (list: any[], limit?: number) =>
    list
      .slice(0, limit || list.length)
      .map((j: any) => (
        <JobCard
          key={j.id}
          job={j}
          audience={role === 'mechanic' ? 'mechanic' : ''}
          person={role === 'mechanic' ? customerNameForJob(j, customers) : ''}
        registration={(data.vehicles || []).find((vehicle: any) => vehicle.id === j.vehicleId)?.registration || ''}
        image={vehicleCardImage(
          resolveVehicleAsset((data.vehicles || []).find((vehicle: any) => vehicle.id === j.vehicleId)),
        )}
        viewLabel={role === 'customer' ? 'View booking' : 'View details'}
        onView={() => {
          if (role === 'customer') {
            followDetail(go, 'dashboard/' + (tab.split('/')[0] || 'bookings'), 'dashboard/bookings/' + encodeURIComponent(j.id));
            setSide(false);
            return;
          }
          if (role === 'mechanic') {
            const section = isPendingRequest(j)
              ? 'pending'
              : isRejectedRequest(j)
                ? 'rejected'
                : isCancelledRequest(j)
                  ? 'cancelled'
                  : '';
            route(section ? `appointments/${section}/${encodeURIComponent(j.id)}` : `jobs/${encodeURIComponent(j.id)}`);
            return;
          }
          setDialog({ kind: 'job', job: j });
        }}
        />
      ));
  return (
    <div
      className={
        'workspace' + (drawer && side ? ' drawer-open' : '') + (dialog ? ' dialog-open' : '')
      }
    >
      {drawer && side ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSide(false)}
        />
      ) : null}
      <WorkspaceSidebar
        accountName={accountName}
        accountPhoto={accountPhoto}
        drawer={drawer}
        goHome={goHome}
        logout={logout}
        onClose={() => setSide(false)}
        role={role}
        route={route}
        side={side}
        tab={tab}
        unread={unread}
      />
      <main className="workspace-main">
        <WorkspaceTopbar
          accountName={accountName}
          accountPhoto={accountPhoto}
          goHome={goHome}
          heading={heading}
          sectionLabel={sectionLabel}
          menuButtonRef={menuButtonRef}
          role={role}
          route={route}
          setSide={setSide}
          setTheme={setTheme}
          side={side}
          tab={tab}
          theme={theme}
          unread={unread}
        />
        <div className="workspace-body">
          {role === 'mechanic' && previewing ? (
            <div className="preview-bar">
              <p>Precision Motorworks demo preview. Your previous session is kept until you leave.</p>
              <button className="secondary" type="button" onClick={() => leaveMechanicPreview()}>
                Return to saved session
              </button>
            </div>
          ) : role === 'mechanic' && activeMechanicProfessionalId(data) !== showcaseProfessionalId ? (
            <div className="preview-bar">
              <p>This saved workshop is not the Precision Motorworks sample, so those bookings stay hidden.</p>
              <button className="secondary" type="button" onClick={() => enterMechanicPreview()}>
                Open Precision Motorworks preview
              </button>
            </div>
          ) : null}
          {tab !== 'find' && !tab.startsWith('find/') && !merchantSection && !(role === 'customer' && (tab.startsWith('garage/') || tab.startsWith('bookings/'))) && !mechanicJobId && !appointmentDetail && (
            <div className={'workspace-heading' + (role === 'customer' && tab === 'garage' ? ' workspace-heading-garage' : '')}>
              <h1>
                {tab === 'overview'
                  ? `Welcome${role === 'customer' ? ' back' : ''}, ${name}.`
                  : heading}
              </h1>
              {role === 'customer' && tab === 'garage' ? (
                <button className="primary" type="button" onClick={() => setDialog({ kind: 'vehicle' })}>
                  Add vehicle <Plus size={17} />
                </button>
              ) : role === 'customer' && !hideFindCta ? (
                <button className="primary" onClick={() => go('dashboard/find')}>
                  Find a professional <Plus size={17} />
                </button>
              ) : null}
            </div>
          )}
          {invalidDetail ? (
            <Card as="section" className="dash-panel">
              <h2>This link is not valid</h2>
              <p>The address could not be read. Open the page again from the menu.</p>
            </Card>
          ) : null}
          {tab === 'overview' && (
            <OverviewPage
              apps={apps}
              cardJobs={cardJobs}
              data={data}
              filter={filter}
              jobs={scopedJobs}
              name={name}
              note={note}
              openReview={openReview}
              role={role}
              route={route}
            />
          )}
          {appointmentView && (
            <AppointmentsPage
              customerName={(job: any) => customerNameForJob(job, customers)}
              jobs={scopedJobs}
              onOpen={(job: any) => route('appointments/' + appointmentView + '/' + encodeURIComponent(job.id))}
              route={route}
              section={appointmentView}
              vehicles={data.vehicles || []}
            />
          )}
          {tab === 'bookings' && role === 'customer' && (
            <JobsPage
              cardJobs={cardJobs}
              hint={(job: any) => customerNameForJob(job, customers)}
              emptyText="Try another status or search."
              emptyTitle="No bookings match."
              filter={filter}
              jobs={bookingsForCustomer(jobs, data.settings?.id || 'cust-01')}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
              statuses={[
                'All',
                'Requested',
                'Rejected',
                'Confirmed',
                'Awaiting approval',
                'Changes requested',
                'Approved',
                'In progress',
                'Awaiting payment',
                'Completed',
                'Cancelled',
              ]}
            />
          )}
          {bookingId && role === 'customer' && (
            <BookingDetailPage
              bookingId={bookingId}
              data={data}
              go={go}
              notify={notify}
              onPanel={(next: string) =>
                route(next === 'overview' ? 'bookings/' + encodeURIComponent(bookingId) : 'bookings/' + encodeURIComponent(bookingId) + '/' + next)
              }
              panel={detailPanel(tab, 'bookings')}
              setDialog={setDialog}
              update={update}
            />
          )}
          {appointmentDetail && role === 'mechanic' && (
            <AppointmentDetailPage
              key={appointmentDetail.id}
              data={data}
              job={scopedJobs.find((item: any) => item.id === appointmentDetail.id) || null}
              notify={notify}
              onAccept={(job: any) => jobAction(job, 'confirm')}
              onReject={(job: any, reason: string) => jobAction(job, 'reject', { reason })}
              route={route}
              section={appointmentDetail.section}
              update={update}
            />
          )}
          {tab === 'jobs' && role === 'mechanic' && (
            <JobsPage
              cardJobs={cardJobs}
              hint={(job: any) => customerNameForJob(job, customers)}
              emptyText="Accepted appointments appear here, including work cancelled after you accepted it."
              emptyTitle="No jobs match."
              filter={filter}
              jobs={scopedJobs.filter(isAcceptedJob)}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
              statuses={[
                'All',
                'Confirmed',
                'Awaiting approval',
                'Changes requested',
                'Approved',
                'In progress',
                'Awaiting payment',
                'Completed',
                'Cancelled',
              ]}
            />
          )}
          {tab === 'jobs' && role === 'admin' && (
            <JobsPage
              cardJobs={cardJobs}
              filter={filter}
              jobs={jobs}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
              statuses={[
                'All',
                'Requested',
                'Rejected',
                'Confirmed',
                'Awaiting approval',
                'Changes requested',
                'Approved',
                'In progress',
                'Awaiting payment',
                'Completed',
                'Cancelled',
              ]}
            />
          )}
          {mechanicJobId && role === 'mechanic' && (
            <JobDetailPage
              key={mechanicJobId}
              data={data}
              go={go}
              job={scopedJobs.find((item: any) => item.id === mechanicJobId && isAcceptedJob(item)) || null}
              notify={notify}
              onAction={jobAction}
              panel={detailPanel(tab, 'jobs')}
              route={route}
              update={update}
            />
          )}
          {tab === 'quotes' && (
            <QuotesPage
              filter={filter}
              jobs={scopedJobs}
              name={name}
              onEdit={(job: any) => route('jobs/' + encodeURIComponent(job.id) + '/quote')}
              quoteEditor={quoteEditor}
              role={role}
              setDialog={setDialog}
            />
          )}
          {tab === 'garage' && role === 'customer' && (
            <GaragePage data={data} go={go} notify={notify} setDialog={setDialog} update={update} />
          )}
          {vehicleDetailId && role === 'customer' && (
            <VehiclePage
              data={data}
              go={go}
              notify={notify}
              setDialog={setDialog}
              update={update}
              vehicleId={vehicleDetailId}
            />
          )}
          {tab === 'payments' && role === 'customer' && (
            <PaymentsPage go={go} jobs={scopedJobs} setDialog={setDialog} />
          )}
          {tab === 'payments' && role === 'mechanic' && (
            <MechanicPaymentsPage jobs={scopedJobs} setDialog={setDialog} />
          )}
          {tab === 'find' && role === 'customer' && (
            <ProfessionalsPage
              embedded
              book={directory.book}
              city={directory.city}
              go={go}
              results={directory.results}
              service={directory.service}
              setCity={directory.setCity}
              setModal={directory.setModal}
              setService={directory.setService}
              setStep={directory.setStep}
              setType={directory.setType}
              type={directory.type}
            />
          )}
          {professionalId && role === 'customer' && (
            <ProfessionalProfilePage
              book={directory.book}
              data={data}
              embedded
              go={go}
              notify={notify}
              professionalId={professionalId}
              role={role}
              update={update}
            />
          )}
          {merchantSection && (
            <MerchantProfilePage
              data={data}
              filter={filter}
              logout={logout}
              name={name}
              note={note}
              notify={notify}
              profile={profile}
              role={role}
              route={route}
              section={merchantSection}
              setProfile={setProfile}
              update={update}
              upload={upload}
              uploadError={uploadError}
            />
          )}
          {(tab === 'applications' || tab === 'applications/history') && (
            <ApplicationsPage
              apps={
                tab === 'applications/history'
                  ? apps.filter(isReviewHistory)
                  : apps.filter(isPendingApplication)
              }
              history={tab === 'applications/history'}
              openReview={openReview}
              query={query}
              route={route}
              setQuery={setQuery}
            />
          )}
          {tab === 'professionals' && role === 'admin' && (
            <ProfessionalsAdminPage
              apps={apps.filter(isManagedProfessional)}
              filter={filter}
              openReview={openReview}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
            />
          )}
          {tab === 'customers' && role === 'admin' && (
            <CustomersPage
              customers={customers}
              jobs={jobs}
              query={query}
              setDialog={setDialog}
              setQuery={setQuery}
            />
          )}
          {analyticsView && (
            <AnalyticsPage
              apps={apps}
              customers={customers}
              data={data}
              jobs={jobs}
              route={route}
              section={analyticsView}
              setDialog={setDialog}
            />
          )}
          {tab === 'finance' && role === 'admin' && (
            <FinancePage
              customers={customers}
              filter={filter}
              jobs={jobs}
              query={query}
              setDialog={setDialog}
              setFilter={setFilter}
              setQuery={setQuery}
            />
          )}
          {tab === 'notifications' && (
            <NotificationsPage data={data} go={go} notify={notify} role={role} update={update} />
          )}
          {adminSection && (
            <AdminProfilePage
              data={data}
              logout={logout}
              notify={notify}
              route={route}
              section={adminSection}
              update={update}
            />
          )}
          {role === 'customer' && (tab === 'profile' || tab === 'settings') && (
            <SettingsPage
              data={data}
              logout={logout}
              name={name}
              notify={notify}
              role={role}
              update={update}
            />
          )}
        </div>
        <div className="workspace-grow" />
        <footer className="workspace-footer">
          <ShieldCheck size={14} aria-hidden="true" /> Demo · No live payments
        </footer>
      </main>
      {dialog && (
        <WorkspaceDialog
          checks={checks}
          data={data}
          dialog={dialog}
          editItems={editItems}
          filter={filter}
          jobAction={jobAction}
          name={name}
          note={note}
          notify={notify}
          profile={profile}
          quoteEditor={quoteEditor}
          quoteNotes={quoteNotes}
          review={review}
          reviewNote={reviewNote}
          role={role}
          setChecks={setChecks}
          setDialog={setDialog}
          setEditItems={setEditItems}
          setQuoteNotes={setQuoteNotes}
          setReviewNote={setReviewNote}
          update={update}
        />
      )}
    </div>
  );
}
