import { JobCard } from '../components/jobs/JobCard';
import { Card } from '../components/ui/Card';
import { WorkspaceSidebar } from '../layouts/WorkspaceSidebar';
import { WorkspaceTopbar } from '../layouts/WorkspaceTopbar';
import { WorkspaceDialog } from '../components/dialogs/WorkspaceDialog';
import { OverviewPage } from '../pages/shared/OverviewPage';
import { JobsPage } from '../pages/shared/JobsPage';
import { QuotesPage } from '../pages/shared/QuotesPage';
import { GaragePage } from '../pages/customer/GaragePage';
import { PaymentsPage } from '../pages/customer/PaymentsPage';
import { BusinessProfilePage } from '../pages/mechanic/BusinessProfilePage';
import { DocumentsPage } from '../pages/mechanic/DocumentsPage';
import { VerificationPage } from '../pages/mechanic/VerificationPage';
import { ApplicationsPage } from '../pages/admin/ApplicationsPage';
import { NotificationsPage } from '../pages/shared/NotificationsPage';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { SettingsPage } from '../pages/shared/SettingsPage';
import { ProfessionalsPage } from '../pages/public/ProfessionalsPage';

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
import { Role, pageTitle, transitionJob } from '../demo';

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
  update: (fn: (value: any) => any) => void;
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
  useEffect(() => {
    setFilter('All');
    setQuery('');
    setDialog(null);
  }, [tab, role]);
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
      ).filter((el) => !el.hasAttribute('disabled'));
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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey, true);
      if (menuButtonRef.current && document.contains(menuButtonRef.current))
        menuButtonRef.current.focus();
    };
  }, [side, drawer]);
  useEffect(() => {
    if (!dialog) return;
    const before = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = document.querySelector('.workspace-dialog') as HTMLElement;
    const fs = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]'),
      ).filter((e) => !e.hasAttribute('disabled'));
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
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, [dialog?.kind]);
  const jobs = data.jobs;
  const unread = data.notifications.filter((n: any) => !n.read).length;
  const accountName = role === 'customer' ? data.settings?.name : '';
  const customerName = customerFullName(accountName);
  const name =
    role === 'customer'
      ? customerName.split(/\s+/)[0] || 'Customer'
      : role === 'mechanic'
        ? data.profile.name
        : 'Verifi team';
  const heading = pageTitle(role, tab);
  const apps = [
    ...(data.application.status !== 'Draft'
      ? [
          {
            ...data.application,
            id: 'my-application',
            name: data.profile.name,
            type: data.profile.type,
            city: data.profile.city,
            date: data.application.submittedAt,
            own: true,
          },
        ]
      : []),
    ...data.reviews,
  ];
  function route(t: string) {
    go('dashboard/' + t);
    setSide(false);
  }
  function goHome() {
    setSide(false);
    go('home');
  }
  function note(d: any, text: string) {
    return {
      ...d,
      notifications: [{ id: crypto.randomUUID(), text, read: false }, ...d.notifications],
    };
  }
  function jobAction(job: any, action: string, extra: any = {}) {
    try {
      const changed = transitionJob(job, action, extra);
      update((d: any) => {
        let next = { ...d, jobs: d.jobs.map((j: any) => (j.id === job.id ? changed : j)) };
        if (action === 'pay')
          next.records = [
            {
              id: job.id,
              title: 'Completed repair',
              date: new Date().toISOString().split('T')[0],
              vehicle: job.vehicle,
              mileage: extra.mileage || 'Not recorded',
              notes: job.completionNotes,
              provider: job.provider,
            },
            ...d.records,
          ];
        return note(next, `${job.id}: ${changed.status}.`);
      });
      setDialog(null);
      notify('Demo job updated: ' + changed.status);
    } catch (e: any) {
      notify(e.message);
    }
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
    update((d: any) =>
      note(
        app.own
          ? { ...d, application: { ...d.application, status, note: reviewNote } }
          : {
              ...d,
              reviews: d.reviews.map((a: any) =>
                a.id === app.id ? { ...a, status, note: reviewNote } : a,
              ),
            },
        `${app.name}: application ${status.toLowerCase()}.`,
      ),
    );
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
    update((d: any) => ({
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
    }));
    setUploadError('');
    e.target.value = '';
    notify('Sample document selected. Only its name and size are saved in this browser.');
  }
  const cardJobs = (list: any[], limit?: number) =>
    list
      .slice(0, limit || list.length)
      .map((j: any) => (
        <JobCard key={j.id} job={j} onView={() => setDialog({ kind: 'job', job: j })} />
      ));
  return (
    <div className={'workspace' + (drawer && side ? ' drawer-open' : '')}>
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
          heading={heading}
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
          {tab !== 'find' && (
            <div className="workspace-heading">
              <div>
                <div className="eyebrow">
                  {role === 'customer'
                    ? 'YOUR JOURNEY, SIMPLIFIED'
                    : role === 'mechanic'
                      ? 'KEEP GOOD WORK MOVING'
                      : 'A CLEARER STANDARD OF CARE'}
                </div>
                <h1>
                  {tab === 'overview'
                    ? `Welcome${role === 'customer' ? ' back' : ''}, ${name}.`
                    : heading}
                </h1>
                <p>
                  {tab === 'overview'
                    ? 'Here’s what needs your attention today.'
                    : 'Manage everything you need, in one place.'}
                </p>
              </div>
              {role === 'customer' && (
                <button className="primary" onClick={() => go('dashboard/find')}>
                  Find a professional <Plus size={17} />
                </button>
              )}
            </div>
          )}
          {tab === 'overview' && (
            <OverviewPage
              apps={apps}
              cardJobs={cardJobs}
              data={data}
              filter={filter}
              jobs={jobs}
              name={name}
              note={note}
              openReview={openReview}
              role={role}
              route={route}
            />
          )}
          {['bookings', 'jobs'].includes(tab) && (
            <JobsPage
              cardJobs={cardJobs}
              filter={filter}
              jobs={jobs}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
            />
          )}
          {tab === 'quotes' && (
            <QuotesPage
              filter={filter}
              jobs={jobs}
              name={name}
              quoteEditor={quoteEditor}
              role={role}
              setDialog={setDialog}
            />
          )}
          {tab === 'garage' && (
            <GaragePage data={data} filter={filter} go={go} setDialog={setDialog} />
          )}
          {tab === 'payments' && (
            <PaymentsPage filter={filter} jobs={jobs} note={note} setDialog={setDialog} />
          )}
          {tab === 'find' && role === 'customer' && (
            <ProfessionalsPage
              embedded
              book={directory.book}
              city={directory.city}
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
          {tab === 'profile' && role === 'mechanic' && (
            <BusinessProfilePage
              filter={filter}
              name={name}
              notify={notify}
              profile={profile}
              route={route}
              setProfile={setProfile}
              update={update}
            />
          )}
          {tab === 'documents' && (
            <DocumentsPage
              data={data}
              filter={filter}
              name={name}
              notify={notify}
              role={role}
              route={route}
              update={update}
              upload={upload}
              uploadError={uploadError}
            />
          )}
          {tab === 'application' && (
            <VerificationPage
              data={data}
              name={name}
              note={note}
              notify={notify}
              profile={profile}
              route={route}
              update={update}
            />
          )}
          {['applications', 'professionals'].includes(tab) && (
            <ApplicationsPage
              apps={apps}
              filter={filter}
              name={name}
              openReview={openReview}
              query={query}
              setFilter={setFilter}
              setQuery={setQuery}
            />
          )}
          {tab === 'notifications' && <NotificationsPage data={data} update={update} />}
          {tab === 'reports' && <ReportsPage data={data} note={note} setDialog={setDialog} />}
          {((role === 'customer' && (tab === 'profile' || tab === 'settings')) ||
            (role !== 'customer' && tab === 'settings')) && (
            <SettingsPage
              data={data}
              logout={logout}
              name={name}
              notify={notify}
              role={role}
              update={update}
            />
          )}
          <div className="workspace-grow" />
          <div className="workspace-footer">
            <ShieldCheck size={14} /> Verifi Auto · Connected design preview{' '}
            <span>Sample data · No live payments</span>
          </div>
        </div>
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
