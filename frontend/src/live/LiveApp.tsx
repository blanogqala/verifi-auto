import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiBase, ApiFailure, displayStatus, money, setCsrf, type LiveUser } from './api';
import { useResource } from './useResource';
import { LiveAuth } from './LiveAuth';
import { LiveVehicles } from './LiveVehicles';
import { LiveDirectory } from './LiveDirectory';
import { LiveBooking } from './LiveBooking';
import { LiveProfile } from './LiveProfile';
import { LiveAdmin } from './LiveAdmin';
import { WorkspaceSidebar } from '../layouts/WorkspaceSidebar';
import { WorkspaceTopbar } from '../layouts/WorkspaceTopbar';
import { PublicHeader } from '../layouts/PublicHeader';
import { PublicFooter } from '../layouts/PublicFooter';
import { LandingPage } from '../pages/public/LandingPage';
import { DetailCard } from '../components/ui/DetailChrome';
import { RoadLoader } from '../components/ui/RoadLoader';
import { photo, shop } from '../config/assets';
import type { Role } from '../types/roles';
import './live.css';
export default function LiveApp() {
  const [user, setUser] = useState<LiveUser | null>(null),
    [ready, setReady] = useState(false);
  const [page, setPage] = useState(location.hash.slice(1) || 'home');
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('verifi-theme') || 'dark'),
    [menu, setMenu] = useState(false),
    [side, setSide] = useState(false);
  const [drawer, setDrawer] = useState(window.matchMedia('(max-width: 1100px)').matches),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [city, setCity] = useState('Cape Town'),
    [service, setService] = useState(''),
    [type, setType] = useState('');
  const go = (next: string) => {
    location.hash = next;
    setPage(next);
    setSide(false);
    setMenu(false);
  };
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const listener = () => setPage(location.hash.slice(1) || 'home');
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1100px)');
    const listener = () => setDrawer(query.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  useEffect(() => {
    if (!drawer || !side) return;
    const sidebar = document.getElementById('workspace-sidebar');
    const buttons = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') || [],
      ).filter((element) => element.offsetParent !== null);
    buttons()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSide(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === 'Tab') {
        const list = buttons();
        const first = list[0],
          last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer, side]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('verifi-theme', theme);
  }, [theme]);
  useEffect(() => {
    api('/auth/session')
      .then((result) => {
        setCsrf(result.csrf);
        setUser(result.user);
      })
      .catch((error) => {
        if (!(error instanceof ApiFailure && error.status === 401))
          setNotice({
            message: 'The server is unavailable. Please try again shortly.',
            error: true,
          });
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!user) {
      setConnected(false);
      return;
    }
    const stream = new EventSource(`${apiBase}/api/notifications/stream`, {
      withCredentials: true,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    stream.onopen = () => {
      setConnected(true);
      refresh();
    };
    stream.onerror = () => setConnected(false);
    const connectedAt = Date.now();
    stream.addEventListener('update', (event) => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 150);
      try {
        const note = JSON.parse((event as MessageEvent).data);
        if (new Date(note.createdAt).getTime() >= connectedAt)
          setNotice((current) =>
            current?.error ? current : { message: note.title, error: false },
          );
      } catch {
        /* A refetch still recovers malformed events. */
      }
    });
    stream.addEventListener('session-ended', () => {
      stream.close();
      setUser(null);
      setCsrf('');
      go('login');
      setNotice({ message: 'Your session ended. Please sign in again.', error: true });
    });
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    return () => {
      clearTimeout(timer);
      stream.close();
      window.removeEventListener('focus', focus);
    };
  }, [user?.id, refresh]);
  async function run(work: () => Promise<any>, success = 'Saved.') {
    setBusy((value) => value + 1);
    try {
      await work();
      refresh();
      if (success) setNotice({ message: success, error: false });
      return true;
    } catch (error: any) {
      setNotice({ message: error.message || 'Could not complete the request.', error: true });
      if (error instanceof ApiFailure && error.status === 401) {
        setUser(null);
        setCsrf('');
        go('login');
      }
      return false;
    } finally {
      setBusy((value) => value - 1);
    }
  }
  function onSession(account: LiveUser) {
    setUser(account);
    const pending = sessionStorage.getItem('verifi-pending-professional');
    sessionStorage.removeItem('verifi-pending-professional');
    go(pending && account.role === 'CUSTOMER' ? 'dashboard/find/' + pending : 'dashboard/overview');
  }
  const logout = () => {
    void run(async () => {
      await api('/auth/logout', 'POST', {});
      setUser(null);
      setCsrf('');
      go('login');
    }, 'Signed out.');
  };
  const section = page.startsWith('dashboard/') ? page.slice('dashboard/'.length) : '',
    base = section.split('/')[0];
  const role = user?.role.toLowerCase() as Role;
  const { data: notifications } = useResource(user ? '/notifications' : null, revision);
  const bookingList =
    !!user?.verifiedAt && ['overview', 'bookings', 'jobs', 'appointments'].includes(base);
  const { data: bookings, error: bookingsError } = useResource(
    bookingList ? '/bookings?take=100' : null,
    revision,
  );
  const { data: payments, error: paymentsError } = useResource(
    user && ['payments', 'finance'].includes(base) ? '/payments' : null,
    revision,
  );
  const detailId = ['bookings', 'jobs'].includes(base)
    ? section.split('/')[1]
    : base === 'appointments'
      ? section.split('/')[2]
      : '';
  const anchor = (id: string) => {
    go('home');
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
    );
  };
  let content;
  if (!ready) content = <RoadLoader label="Connecting to your account…" />;
  else if (
    ['login', 'register', 'forgot', 'reset', 'verify'].includes(page.split('?')[0]) ||
    (section && !user)
  )
    content = (
      <LiveAuth
        key={page}
        page={section ? 'login' : page}
        go={go}
        onSession={onSession}
        run={run}
      />
    );
  else if (!section)
    content = (
      <>
        <PublicHeader
          accountLabel={user?.name || 'My account'}
          anchor={anchor}
          go={go}
          logout={logout}
          menu={menu}
          page={page}
          role={user ? role : null}
          setMenu={setMenu}
          setTheme={setTheme}
          theme={theme}
        />
        {page === 'home' ? (
          <LandingPage
            anchor={anchor}
            city={city}
            go={go}
            photo={photo}
            service={service}
            setCity={setCity}
            setService={setService}
            setType={setType}
            shop={shop}
            type={type}
          />
        ) : (
          <div className="live-public">
            <LiveDirectory
              professionalId={page.startsWith('professional/') ? page.split('/')[1] : ''}
              user={user}
              revision={revision}
              run={run}
              go={go}
            />
          </div>
        )}
        <PublicFooter go={go} anchor={anchor} setModal={() => go('register')} />
      </>
    );
  else if (user) {
    let workspace;
    if (base === 'profile' || base === 'settings')
      workspace = (
        <LiveProfile user={user} run={run} revision={revision} refresh={refresh} onUser={setUser} />
      );
    else if (base === 'notifications')
      workspace = (
        <div className="detail-page">
          <h1>Notifications</h1>
          {notifications?.map((note: any) => (
            <DetailCard key={note.id} title={note.title}>
              <p>{new Date(note.createdAt).toLocaleString()}</p>
              <div className="button-row">
                {['booking', 'quotation', 'message', 'payment', 'history-access'].includes(
                  note.topic,
                ) ? (
                  <button
                    className="primary"
                    onClick={() =>
                      go(
                        `dashboard/${role === 'customer' ? 'bookings' : 'jobs'}/${note.resourceId}`,
                      )
                    }
                  >
                    View booking
                  </button>
                ) : null}
                {!note.readAt ? (
                  <button
                    className="secondary"
                    onClick={() =>
                      run(
                        () => api('/notifications/read', 'POST', { ids: [note.id] }),
                        'Marked read.',
                      )
                    }
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </DetailCard>
          ))}
          {notifications?.length === 0 ? <p>You're all caught up.</p> : null}
        </div>
      );
    else if (!user.verifiedAt)
      workspace = (
        <DetailCard title="Verify your email">
          <p>Check your inbox to activate bookings and your professional application.</p>
          <button
            className="primary"
            onClick={() =>
              run(
                () => api('/auth/resend-verification', 'POST', {}),
                'Verification email requested.',
              )
            }
          >
            Resend verification email
          </button>
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                const result = await api('/auth/session');
                setCsrf(result.csrf);
                setUser(result.user);
              }, 'Account refreshed.')
            }
          >
            I have verified my email
          </button>
        </DetailCard>
      );
    else if (base === 'find')
      workspace = (
        <LiveDirectory
          professionalId={section.split('/')[1]}
          user={user}
          revision={revision}
          run={run}
          go={go}
        />
      );
    else if (base === 'garage' && role === 'customer')
      workspace = (
        <LiveVehicles
          key={section}
          vehicleId={section.split('/')[1]}
          revision={revision}
          run={run}
          go={go}
          refresh={refresh}
        />
      );
    else if (detailId)
      workspace = (
        <LiveBooking
          key={detailId}
          bookingId={detailId}
          user={user}
          revision={revision}
          run={run}
          go={go}
          refresh={refresh}
        />
      );
    else if (['payments', 'finance'].includes(base))
      workspace = (
        <div className="detail-page">
          <h1>Payments</h1>
          {paymentsError ? (
            <p role="alert">{paymentsError}</p>
          ) : !payments ? (
            <RoadLoader label="Loading payments…" />
          ) : payments.length ? (
            payments.map((payment: any) => (
              <DetailCard key={payment.id} title={money(payment.amountCents)}>
                <p>
                  {payment.provider === 'TEST' ? 'Test payment' : 'Confirmed payment'} ·{' '}
                  {new Date(payment.paidAt).toLocaleDateString()}
                </p>
                <p>
                  Quotation {payment.quote.number} · {payment.providerReference}
                </p>
                <button
                  className="secondary"
                  onClick={() =>
                    go(
                      `dashboard/${role === 'customer' ? 'bookings' : 'jobs'}/${payment.quote.bookingId}`,
                    )
                  }
                >
                  View booking and invoice
                </button>
              </DetailCard>
            ))
          ) : (
            <p>No confirmed payments yet.</p>
          )}
        </div>
      );
    else if (role === 'admin' && !['jobs', 'appointments'].includes(base))
      workspace = (
        <LiveAdmin section={section} revision={revision} run={run} go={go} refresh={refresh} />
      );
    else if (bookingList) {
      const statusFilter =
        base === 'appointments'
          ? section.includes('rejected')
            ? 'REJECTED'
            : section.includes('cancelled')
              ? 'CANCELLED'
              : 'REQUESTED'
          : '';
      const rows = bookings?.filter((job: any) =>
        statusFilter
          ? job.status === statusFilter
          : base === 'jobs'
            ? !['REQUESTED', 'REJECTED', 'CANCELLED'].includes(job.status)
            : true,
      );
      workspace = (
        <div className="detail-page">
          <h1>
            {base === 'overview'
              ? `Welcome, ${user.name.split(' ')[0]}`
              : base === 'appointments'
                ? 'Appointments'
                : role === 'customer'
                  ? 'My bookings'
                  : 'Jobs & activity'}
          </h1>
          {base === 'appointments' ? (
            <div className="button-row">
              {['pending', 'rejected', 'cancelled'].map((tab) => (
                <button
                  className="secondary"
                  key={tab}
                  onClick={() => go('dashboard/appointments/' + tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : null}
          {bookingsError ? (
            <p role="alert">{bookingsError}</p>
          ) : !rows ? (
            <RoadLoader label="Loading bookings…" />
          ) : rows.length ? (
            <div className="live-card-grid">
              {rows.map((job: any) => (
                <button
                  type="button"
                  className="live-resource-card"
                  key={job.id}
                  onClick={() =>
                    go(
                      `dashboard/${role === 'customer' ? 'bookings' : base === 'appointments' ? 'appointments/pending' : 'jobs'}/${job.id}`,
                    )
                  }
                >
                  <strong>
                    {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                  </strong>
                  <span>{role === 'mechanic' ? job.customer.name : job.professional.name}</span>
                  <span>{new Date(job.appointmentAt).toLocaleString()}</span>
                  <span className="quotation-state">{displayStatus(job.status)}</span>
                </button>
              ))}
            </div>
          ) : (
            <DetailCard title="No bookings yet">
              <p>
                {role === 'customer'
                  ? 'Add a vehicle and find a verified professional to get started.'
                  : 'New requests will appear automatically here.'}
              </p>
            </DetailCard>
          )}
        </div>
      );
    } else
      workspace = (
        <DetailCard title="Page not available">
          <p>Choose a page from the sidebar.</p>
        </DetailCard>
      );
    content = (
      <div className={'workspace live-workspace' + (drawer && side ? ' drawer-open' : '')}>
        {drawer && side ? (
          <button
            className="sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setSide(false)}
          />
        ) : null}
        <WorkspaceSidebar
          accountName={user.name}
          goHome={() => go('home')}
          logout={logout}
          onClose={() => setSide(false)}
          role={role}
          route={(tab) => go('dashboard/' + tab)}
          side={side}
          tab={section}
          unread={notifications?.filter((n: any) => !n.readAt).length || 0}
          drawer={drawer}
        />
        <main className="workspace-main">
          <WorkspaceTopbar
            live
            accountName={user.name}
            heading={base}
            role={role}
            goHome={() => go('home')}
            route={(tab) => go('dashboard/' + tab)}
            setSide={setSide}
            side={side}
            tab={section}
            unread={notifications?.filter((n: any) => !n.readAt).length || 0}
            theme={theme}
            setTheme={setTheme}
            menuButtonRef={menuButtonRef}
          />
          <div className="workspace-body">
            <p className="live-connection" role="status">
              {connected ? 'Live updates connected' : 'Reconnecting to live updates…'}
            </p>
            {workspace}
          </div>
        </main>
      </div>
    );
  }
  return (
    <>
      {content}
      {busy > 0 ? (
        <div className="live-saving" role="status">
          Saving securely…
        </div>
      ) : null}
      {notice ? (
        <div
          className={'live-toast' + (notice.error ? ' error' : '')}
          role={notice.error ? 'alert' : 'status'}
        >
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
