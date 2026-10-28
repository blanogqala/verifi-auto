import { AdminJobsPage, AdminDisputePage } from '../pages/admin/AdminJobsPage';
import { appendAdminActivity } from '../features/admin/detailRecords';
import { finishApplicationReview } from '../features/admin/reviewResult';
import { ApplicationDetailPage, ProfessionalAdminDetailPage, CustomerAdminDetailPage, AdminJobDetailPage } from '../pages/admin/AdminDetailPages';
import { JobCard } from '../components/jobs/JobCard';
import { Card } from '../components/ui/Card';
import { WorkspaceSidebar } from '../layouts/WorkspaceSidebar';
import { WorkspaceTopbar } from '../layouts/WorkspaceTopbar';
import { WorkspaceDialog } from '../components/dialogs/WorkspaceDialog';
import { OverviewPage } from '../pages/shared/OverviewPage';
import { JobsPage } from '../pages/shared/JobsPage';
import { QuotesPage } from '../pages/shared/QuotesPage';
import { GaragePage } from '../pages/customer/GaragePage';
import { EmergencyPage } from '../pages/customer/EmergencyPage';
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
import { RoadLoader } from '../components/ui/RoadLoader';
import { defaultDiscovery, type DiscoverySession } from '../features/professionals/discovery';
import { canSubmit } from '../features/onboarding/applicationRules';

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
import { api, apiBase } from '../data-access/api';
import { unreadAppointmentRequestIds, unreadBookingNotices, unreadBookingIds, markNotificationsRead, notificationsFor } from '../features/notifications/inbox';
import { VehicleStage } from '../components/garage/VehicleStage';
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
  quoteTotal,
} from '../demo';
import {
  awaitingCustomerPayments,
  paymentRecordTotal,
  recordedCustomerPayments,
} from '../features/admin/paymentRecords';

export type DirectoryProps = {
  book: (professional: any) => void;
  discovery: DiscoverySession;
  results: any[];
  allProfessionals?: any[];
  service: string;
  setDiscovery: (value: DiscoverySession | ((current: DiscoverySession) => DiscoverySession)) => void;
  setService: (value: string) => void;
  setType: (value: string) => void;
  type: string;
  profileFor?: (id: string) => any;
  profileState?: 'idle' | 'loading' | 'found' | 'missing' | 'error';
  directoryStatus?: 'loading' | 'ready';
  loadError?: string;
};

const emptyDirectory: DirectoryProps = {
  book: () => {},
  discovery: { ...defaultDiscovery },
  results: [],
  allProfessionals: [],
  service: 'All services',
  setDiscovery: () => {},
  setService: () => {},
  setType: () => {},
  type: 'Either',
};

export type WorkspaceProps = {
  role: Role;
  tab: string;
  go: (page: string) => void;
  logout: () => void;
  data: any;
  update: (fn: (value: any) => any) => boolean | void | Promise<boolean | void>;
  notify: (message: string) => void;
  theme?: string;
  setTheme?: (theme: string) => void;
  directory?: DirectoryProps;
  live?: boolean;
  verified?: boolean;
  refresh?: () => void;
  loadError?: string;
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
  live = false,
  verified = true,
  refresh = () => {},
  loadError = '',
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
  const profileDirty = useRef(false);
  const profileEditStamp = useRef(0);
  function editProfile(next: any) {
    profileDirty.current = true;
    profileEditStamp.current += 1;
    setProfile(next);
  }
  useEffect(() => {
    if (!live || profileDirty.current) return;
    setProfile({
      ...(data.profile || {}),
      services: Array.isArray(data.profile?.services) ? data.profile.services : [],
      photo: data.profile?.photo || data.settings?.photo || '',
    });
  }, [live, data.profile, data.settings?.photo]);
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
        if (document.querySelector('.modal-backdrop')) return;
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
  const jobs = data.jobs;
  const selfId = participantId(data, role);
  const unread = unreadNotificationCount(data, role, selfId);
  const scopedJobs =
    role === 'mechanic'
      ? jobsForMechanic(jobs, data)
      : role === 'customer'
        ? bookingsForCustomer(jobs, data.settings?.id || 'cust-01')
        : jobs;
  const unreadRequestIds = role === 'mechanic'
    ? unreadAppointmentRequestIds(data, scopedJobs)
    : [];
  const unreadBookingIdSet = new Set(role === 'customer' || role === 'mechanic' ? unreadBookingIds(data, role) : []);
  const bookingAttention = role === 'customer'
    ? scopedJobs.filter((job: any) => unreadBookingIdSet.has(job.id)).length : 0;
  const jobAttention = role === 'mechanic'
    ? scopedJobs.filter((job: any) => isAcceptedJob(job) && unreadBookingIdSet.has(job.id)).length : 0;
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
  const locked =
    live && !verified && tab !== 'notifications' && !tab.startsWith('profile');
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
  const mechanicJobId = role === 'mechanic' && tab !== 'jobs/emergencies' ? detailId(tab, 'jobs') : undefined;
  const appointmentDetail = role === 'mechanic' ? appointmentTarget(tab) : undefined;
  const invalidDetail =
    professionalId === null || bookingId === null || vehicleDetailId === null || mechanicJobId === null || appointmentDetail === null;
  const hideFindCta =
    role === 'customer' && ['profile', 'settings', 'garage', 'payments', 'emergency'].includes(sectionRoot);
  const accountPhoto =
    role === 'customer'
      ? data.settings?.photo || ''
      : role === 'mechanic'
        ? profile?.photo ?? data.settings?.photo ?? data.profile?.photo ?? ''
        : '';
  const heading = pageTitle(role, tab);
  const apps = applicationRecords(data);
  const adminDetailKind = role === 'admin' && ['applications', 'professionals', 'customers', 'jobs', 'disputes'].includes(sectionRoot) && tab.includes('/') && tab !== 'applications/history' && tab !== 'jobs/disputes' ? sectionRoot : '';
  const adminDetailId = adminDetailKind ? detailId(tab, adminDetailKind) : undefined;
  useEffect(() => { setChecks([]); setReviewNote(apps.find((a: any) => a.id === adminDetailId)?.note || ''); }, [adminDetailId]);
  const customers = customerRecords(data);
  // Opening the parent Appointments tab never clears its orange dot.
  // A particular unread request is acknowledged only when its detail is reached.
  const attendedRef = useRef('');
  useEffect(() => {
    if (role !== 'mechanic' || !appointmentDetail || appointmentDetail.section !== 'pending') return;
    const bookingId = appointmentDetail.id;
    if (!unreadRequestIds.includes(bookingId)) return;
    const ids = notificationsFor(data, 'mechanic', selfId)
      .filter((note: any) => !note.read && note.bookingId === bookingId &&
        (note.title === 'New assessment request' || note.title === 'URGENT roadside assistance request' ||
          (note.type === 'request' && /^new (assessment )?request\b/i.test(note.title || ''))))
      .map((note: any) => note.id);
    if (!ids.length) return;
    const key = bookingId + ':' + ids.join('|');
    if (attendedRef.current === key) return;
    attendedRef.current = key;
    void Promise.resolve(
      update((current: any) => markNotificationsRead(current, { role: 'mechanic', id: selfId, ids })),
    ).catch((error: any) => {
      attendedRef.current = '';
      notify(error?.message || 'Could not mark the appointment as viewed.');
    });
  }, [role, appointmentDetail?.id, appointmentDetail?.section, data.notifications, selfId, update]);
  // A dot is acknowledged only when the matching booking section is reached.
  // VAR and work-report dots stay on their own cards until the card is expanded.
  useEffect(() => {
    if (role !== 'customer' && role !== 'mechanic') return;
    const openedId = role === 'customer' ? bookingId : mechanicJobId;
    if (!openedId) return;
    const section = tab.endsWith('/messages') ? 'messages'
      : tab.endsWith('/quote') ? 'quote'
      : tab.endsWith('/var') || tab.endsWith('/activity') ? ''
      : 'overview';
    if (!section) return;
    const ids = unreadBookingNotices(data, role, openedId, section).map((note: any) => note.id);
    if (!ids.length) return;
    void Promise.resolve(update((current: any) =>
      markNotificationsRead(current, { role, id: selfId, ids }))).catch((error: any) =>
      notify(error?.message || 'Could not clear the booking indicator.'));
  }, [role, bookingId, mechanicJobId, tab, data.notifications, selfId, update]);
  function route(t: string) {
    go('dashboard/' + t);
    setSide(false);
  }
  function goHome() {
    setSide(false);
    go('home');
  }
  function note(d: any, text: string, audience?: { role: string; id: string; section?: string }) {
    const recipientRole = audience?.role || (role === 'admin' ? 'admin' : role);
    const recipientId = audience?.id || participantId(d, recipientRole);
    return appendNotification(d, {
      recipientRole,
      recipientId,
      type: 'account',
      title: 'Update',
      message: text,
      section: audience?.section || (recipientRole === 'admin' ? 'reports/support' : ''),
    });
  }
  function actor() {
    if (role === 'mechanic') return { role: 'mechanic' as const, id: activeMechanicProfessionalId(data) };
    if (role === 'customer') return { role: 'customer' as const, id: data.settings?.id || 'cust-01' };
    return { role: 'admin' as const, id: 'admin' };
  }
  function jobAction(job: any, action: string, extra: any = {}) {
    if (live && action === 'pay') {
      notify('Online card payments are not available until a payment provider is connected.');
      return false;
    }
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
    const finish = (ok: boolean) => {
      if (!ok) return false;
      setDialog(null);
      if (!duplicate) notify(live ? 'Saved.' : 'Demo job updated: ' + status);
      if (action === 'confirm') route('jobs/' + encodeURIComponent(job.id));
      if (action === 'reject') route('appointments/rejected/' + encodeURIComponent(job.id));
      return true;
    };
    if (saved && typeof (saved as Promise<boolean>).then === 'function') {
      void (saved as Promise<boolean>).then(finish);
      return true;
    }
    return finish(saved !== false);
  }
  function review(app: any, status: string) {
    if (status !== 'Approved' && !reviewNote.trim()) {
      notify('Add a reason or requested changes first.');
      return;
    }
    const decision = decideApplication(app, status, reviewNote);
    const saved = commitUpdate(
      update,
      (d: any) =>
        appendAdminActivity(note(
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
          { role: 'admin', id: 'admin', section: 'applications/' + encodeURIComponent(app.id) },
        ), { action: 'Application ' + status.toLowerCase(), actor: data.adminAccount?.name || 'Admin', role: 'admin', target: app.id }),
      notify,
      '',
    );
    finishApplicationReview(saved, {
      live,
      status,
      notify,
      close: () => setDialog(null),
    });
  }
  function openReview(a: any) {
    setChecks([]);
    setReviewNote(a.note || '');
    route((tab === 'professionals' ? 'professionals/' : 'applications/') + encodeURIComponent(a.id));
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
    if (live) {
      const body = new FormData();
      body.set('file', file);
      body.set('kind', kind || 'IDENTITY');
      e.target.value = '';
      void api('/documents', 'POST', body)
        .then(() => {
          refresh();
          notify('Document uploaded privately.');
        })
        .catch((error: any) => setUploadError(error.message));
      return;
    }
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
        attention={unreadBookingIdSet.has(j.id) ? 1 : 0}
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
          route('jobs/' + encodeURIComponent(j.id));
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
        appointmentAttention={unreadRequestIds.length}
        bookingAttention={bookingAttention}
        jobAttention={jobAttention}
      />
      <main className="workspace-main">
        <WorkspaceTopbar
          live={live}
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
          {live && loadError ? (
            <div className="notice" role="alert">
              <p>{loadError}</p>
              <button className="secondary" type="button" onClick={() => refresh()}>
                Try again
              </button>
            </div>
          ) : null}
          {live && !verified && !tab.startsWith('profile') && tab !== 'notifications' ? (
            <Card as="section" className="dash-panel">
              <h2>Verify your email</h2>
              <p>Open the link we sent you before using bookings, your garage, or administration.</p>
              <button
                className="primary"
                type="button"
                onClick={() =>
                  void api('/auth/resend-verification', 'POST', {})
                    .then(() => notify('Verification email sent.'))
                    .catch((error: any) => notify(error.message))
                }
              >
                Resend verification email
              </button>
            </Card>
          ) : null}
          {!live && role === 'mechanic' && previewing ? (
            <div className="preview-bar">
              <p>Precision Motorworks demo preview. Your previous session is kept until you leave.</p>
              <button className="secondary" type="button" onClick={() => leaveMechanicPreview()}>
                Return to saved session
              </button>
            </div>
          ) : !live && role === 'mechanic' && activeMechanicProfessionalId(data) !== showcaseProfessionalId ? (
            <div className="preview-bar">
              <p>This saved workshop is not the Precision Motorworks sample, so those bookings stay hidden.</p>
              <button className="secondary" type="button" onClick={() => enterMechanicPreview()}>
                Open Precision Motorworks preview
              </button>
            </div>
          ) : null}
          {tab !== 'find' && !tab.startsWith('find/') && !merchantSection && !(role === 'customer' && (tab.startsWith('garage/') || tab.startsWith('bookings/'))) && !mechanicJobId && !appointmentDetail && !adminDetailKind && (
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
          {adminDetailKind === 'applications' && <ApplicationDetailPage key={adminDetailId} record={apps.find((a: any) => a.id === adminDetailId)} data={data} route={route} review={review} checks={checks} setChecks={setChecks} reviewNote={reviewNote} setReviewNote={setReviewNote} connected={live ? {
            previewUrl: (id: string) => `${apiBase}/api/documents/${encodeURIComponent(id)}/preview`,
            reviewDocument: async (id: string, previousStatus: string) => {
              await api(`/admin/documents/${encodeURIComponent(id)}/review`, 'POST', {
                decision: 'APPROVED', previousStatus, note: '',
              });
              refresh();
              notify('Document approved.');
            },
            removeDocument: async (id: string, note: string) => {
              await api(`/admin/documents/${encodeURIComponent(id)}`, 'DELETE', { note });
              refresh();
              notify('Document removed. The mechanic must submit a replacement.');
            },
          } : undefined} />}
          {adminDetailKind === 'professionals' && <ProfessionalAdminDetailPage key={adminDetailId} record={apps.filter(isManagedProfessional).find((a: any) => a.id === adminDetailId)} data={data} route={route} connected={live ? { refresh } : undefined} />}
          {adminDetailKind === 'customers' && (
            <CustomerAdminDetailPage
              key={adminDetailId}
              customer={customers.find((c: any) => c.id === adminDetailId)}
              data={data}
              route={route}
              connected={live ? { refresh } : undefined}
            />
          )}
          {adminDetailKind === 'jobs' && <AdminJobDetailPage key={adminDetailId} job={jobs.find((j: any) => j.id === adminDetailId)} data={data} route={route} />}
          {adminDetailKind === 'disputes' && <AdminDisputePage key={adminDetailId} id={adminDetailId} data={data} route={route} update={update} notify={notify} />}
          {!locked && tab === 'overview' && (
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
          {!locked && tab === 'emergency' && role === 'customer' && (
            <EmergencyPage
              data={data}
              professionals={directory.allProfessionals || directory.results}
              live={live}
              go={go}
              notify={notify}
              refresh={refresh}
              update={update}
            />
          )}
          {!locked && appointmentView && (
            <AppointmentsPage
              customerName={(job: any) => job.customerName || customerNameForJob(job, customers)}
              jobs={scopedJobs}
              unreadRequestIds={unreadRequestIds}
              live={live}
              onOpen={(job: any) => route('appointments/' + appointmentView + '/' + encodeURIComponent(job.id))}
              route={route}
              section={appointmentView}
              vehicles={data.vehicles || []}
            />
          )}
          {!locked && tab === 'bookings' && role === 'customer' && (
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
          {!locked && bookingId && role === 'customer' && (
            <BookingDetailPage
              bookingId={bookingId}
              focusSection={tab.endsWith('/var') ? 'var' : tab.endsWith('/activity') ? 'activity' : ''}
              data={data}
              professionals={directory.allProfessionals || directory.results}
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
          {!locked && appointmentDetail && role === 'mechanic' && (
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
          {!locked && (tab === 'jobs' || tab === 'jobs/emergencies') && role === 'mechanic' && (
            <JobsPage
              cardJobs={cardJobs}
              hint={(job: any) => customerNameForJob(job, customers)}
              emptyText="Accepted appointments appear here, including work cancelled after you accepted it."
              emptyTitle="No jobs match."
              filter={filter}
              jobs={scopedJobs.filter((job: any) => isAcceptedJob(job) && (tab !== 'jobs/emergencies' || job.kind === 'EMERGENCY'))}
               scope={tab === 'jobs/emergencies' ? 'emergencies' : 'all'}
               onScopeChange={(next: string) => route(next === 'emergencies' ? 'jobs/emergencies' : 'jobs')}
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
          {!locked && role === 'admin' && (tab === 'jobs' || tab === 'jobs/disputes') && <AdminJobsPage data={data} cardJobs={cardJobs} route={route} section={tab === 'jobs/disputes' ? 'disputes' : 'jobs'} live={live} />}
          {!locked && mechanicJobId && role === 'mechanic' && (
            <JobDetailPage
              key={mechanicJobId}
              data={data}
              go={go}
              job={scopedJobs.find((item: any) => item.id === mechanicJobId && isAcceptedJob(item)) || null}
              notify={notify}
              onAction={jobAction}
              live={live}
              refresh={refresh}
              panel={detailPanel(tab, 'jobs')}
              route={route}
              update={update}
            />
          )}
          {!locked && tab === 'quotes' && (
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
          {!locked && tab === 'garage' && role === 'customer' && (
            <GaragePage
              data={data}
              go={go}
              notify={notify}
              setDialog={setDialog}
              update={update}
              connected={
                live
                  ? {
                      renderStage: (vehicle: any) => {
                        // GET /vehicles returns identity records without per-vehicle
                        // modelAsset. Always resolve against the reviewed local
                        // catalogue in this authenticated view as well as demo mode.
                        // A verified backend asset takes priority when actually sent.
                        const verifiedAsset = vehicle.modelMatch === 'verified' && vehicle.modelAsset;
                        const resolved = verifiedAsset ? {
                          status: 'exact' as const,
                          label: 'Verified 3D model for this vehicle',
                          reason: 'This published model was verified against the vehicle details.',
                          asset: {
                            ...vehicle.modelAsset,
                            src: vehicle.modelAsset.modelUrl,
                            source: vehicle.modelAsset.sourceUrl || '',
                            paintMaterials: vehicle.modelAsset.paintMaterials || [],
                          },
                        } : resolveVehicleAsset(vehicle);
                        return <VehicleStage vehicle={vehicle} resolved={resolved} />;
                      },
                    }
                  : undefined
              }
            />
          )}
          {!locked && vehicleDetailId && role === 'customer' && (
            <VehiclePage
              data={data}
              go={go}
              notify={notify}
              setDialog={setDialog}
              update={update}
              vehicleId={vehicleDetailId}
              live={live}
            />
          )}
          {!locked && tab === 'payments' && role === 'customer' && (
            <PaymentsPage go={go} jobs={scopedJobs} live={live} setDialog={setDialog} />
          )}
          {!locked && tab === 'payments' && role === 'mechanic' && (
            <MechanicPaymentsPage
              jobs={scopedJobs}
              setDialog={
                live
                  ? (value: any) =>
                      route('jobs/' + encodeURIComponent(value.job.bookingId || value.job.id))
                  : setDialog
              }
              connected={
                live
                  ? {
                      awaiting: awaitingCustomerPayments(scopedJobs).map((job: any) => ({
                        ...job,
                        amountCents: Math.round(quoteTotal(job) * 100),
                      })),
                      recorded: recordedCustomerPayments(scopedJobs).map((job: any) => ({
                        ...job,
                        amountCents: Math.round(quoteTotal(job) * 100),
                        test: Boolean(job.testPayment),
                      })),
                    }
                  : undefined
              }
            />
          )}
          {!locked && tab === 'find' && role === 'customer' && (
            <ProfessionalsPage
              embedded
              book={directory.book}
              discovery={directory.discovery}
              go={go}
              results={directory.results}
              service={directory.service}
              setDiscovery={directory.setDiscovery}
              setService={directory.setService}
              setType={directory.setType}
              type={directory.type}
              live={live}
              loading={live && directory.directoryStatus === 'loading'}
              error={live ? directory.loadError || '' : ''}
            />
          )}
          {!locked && professionalId && role === 'customer' && (
            live &&
            !directory.profileFor?.(professionalId) &&
            directory.profileState !== 'missing' &&
            directory.profileState !== 'error' ? (
              <RoadLoader label="Loading professional…" />
            ) : (
            <ProfessionalProfilePage
              book={directory.book}
              data={data}
              embedded
              go={go}
              notify={notify}
              professionalId={professionalId}
              role={role}
              update={update}
              connected={
                live
                  ? {
                      profile: directory.profileFor?.(professionalId) || null,
                      reviews: directory.profileFor?.(professionalId)?.reviews || [],
                      directionsUrl: directory.profileFor?.(professionalId)?.directionsUrl,
                      rating: directory.profileFor?.(professionalId)?.rating,
                    }
                  : undefined
              }
            />
            )
          )}
          {!locked && merchantSection && (
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
              setProfile={live ? editProfile : setProfile}
              update={update}
              upload={upload}
              uploadError={uploadError}
              connected={
                live
                  ? {
                      previewUrl: (id: string) => `${apiBase}/api/documents/${encodeURIComponent(id)}/preview`,
                      save: async (nextProfile: any) => {
                        const stamp = profileEditStamp.current;
                        try {
                          await update((current: any) => ({
                            ...current,
                            profile: { ...current.profile, ...nextProfile },
                          }));
                          if (profileEditStamp.current === stamp) profileDirty.current = false;
                          notify(
                            'Business profile saved. Your existing approval remains active.',
                          );
                        } catch (reason: any) {
                          notify(reason?.message || 'The profile could not be saved.');
                          throw reason;
                        }
                      },
                      savePhoto: async (photo: string) => {
                        await update((current: any) => ({
                          ...current,
                          settings: { ...current.settings, photo },
                          profile: { ...current.profile, photo },
                        }));
                        setProfile((current: any) => ({ ...current, photo }));
                        notify(photo ? 'Profile photo saved.' : 'Profile photo removed.');
                      },
                      remove: async (id: string) => {
                        try {
                          await api('/documents/' + id, 'DELETE');
                          refresh();
                          notify('Document removed.');
                        } catch (reason: any) {
                          notify(reason?.message || 'The document could not be removed.');
                        }
                      },
                      submit: async () => {
                        try {
                          await api('/professional/me/submit', 'POST', {});
                          refresh();
                          notify('Submitted for review.');
                        } catch (reason: any) {
                          notify(reason?.message || 'The application could not be submitted.');
                        }
                      },
                      canSubmit: canSubmit(data),
                    }
                  : undefined
              }
            />
          )}
          {!locked && (tab === 'applications' || tab === 'applications/history') && (
            <ApplicationsPage
              live={live}
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
          {!locked && tab === 'professionals' && role === 'admin' && (
            <ProfessionalsAdminPage
              live={live}
              data={data}
              apps={apps.filter(isManagedProfessional)}
              filter={filter}
              openReview={openReview}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
            />
          )}
          {!locked && tab === 'customers' && role === 'admin' && (
            <CustomersPage
              live={live}
              customers={customers}
              jobs={jobs}
              query={query}
              setDialog={(value: any) => route('customers/' + encodeURIComponent(value.customer.id))}
              setQuery={setQuery}
            />
          )}
          {!locked && analyticsView && (
            <AnalyticsPage
              live={live}
              apps={apps}
              customers={customers}
              data={data}
              jobs={jobs}
              route={route}
              section={analyticsView}
              setDialog={setDialog}
            />
          )}
          {!locked && tab === 'finance' && role === 'admin' && (
            <FinancePage
              connected={
                live
                  ? {
                      awaiting: awaitingCustomerPayments(jobs).map((job: any) => ({
                        ...job,
                        amountCents: Math.round(quoteTotal(job) * 100),
                      })),
                      recorded: recordedCustomerPayments(jobs).map((job: any) => ({
                        ...job,
                        amountCents: Math.round(quoteTotal(job) * 100),
                        test: Boolean(job.testPayment),
                      })),
                    }
                  : undefined
              }
              customers={customers}
              filter={filter}
              jobs={jobs}
              query={query}
              setDialog={
                live
                  ? (value: any) =>
                      route('jobs/' + encodeURIComponent(value.job.bookingId || value.job.id))
                  : setDialog
              }
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
              connected={
                live
                  ? {
                      save: async (values: any) => {
                        await api('/auth/profile', 'PATCH', values);
                        refresh();
                        notify('Profile saved.');
                      },
                      changePassword: async (values: any) => {
                        await api('/auth/password', 'POST', values);
                        notify('Password changed. Sign in again.');
                        logout();
                      },
                    }
                  : undefined
              }
            />
          )}
        </div>
        <div className="workspace-grow" />
        <footer className="workspace-footer">
          <ShieldCheck size={14} aria-hidden="true" /> {live ? 'No live card payments' : 'Demo · No live payments'}
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
          live={live}
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
