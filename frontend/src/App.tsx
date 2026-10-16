import { photo, shop } from './config/assets';
import { providers } from './data/professionals';
import { PublicHeader } from './layouts/PublicHeader';
import { LandingPage } from './pages/public/LandingPage';
import { ProfessionalsPage } from './pages/public/ProfessionalsPage';
import { PublicFooter } from './layouts/PublicFooter';
import { BookingDialog } from './components/booking/BookingDialog';
import { ProfessionalProfilePage } from './components/professionals/ProfessionalProfilePage';
import { useState, useEffect, useRef } from 'react';

import { Workspace } from './layouts/WorkspaceLayout';
import { AuthPage as Auth } from './pages/auth/AuthPage';
import {
  Role,
  roles,
  canVisit,
  canonicalPage,
  applyAccountDetails,
  directoryEntries,
  safeRouteId,
  storageFailureMessage,
  useDemoStore,
} from './demo';

function storedRole(): Role | null {
  try {
    const saved = sessionStorage.getItem('verifi-demo-role');
    return roles.includes(saved as Role) ? (saved as Role) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('verifi-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [page, setPage] = useState(() =>
    canonicalPage(storedRole(), location.hash.slice(1) || 'home'),
  );
  const [role, setRole] = useState<Role | null>(storedRole);
  const [data, update] = useDemoStore();
  const [pending, setPending] = useState<any>(null);
  const [menu, setMenu] = useState(false);
  const [city, setCity] = useState('All locations');
  const [service, setService] = useState('All services');
  const [type, setType] = useState('Either');
  const [modal, setModal] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [toast, setToast] = useState('');
  const [sectionTarget, setSectionTarget] = useState<{
    id: string;
    nonce: number;
    smooth: boolean;
  } | null>(null);
  const handledSection = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('verifi-theme', theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (toast) {
      let t = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const prior = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = document.querySelector('.modal') as HTMLElement;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,[tabindex="0"]'),
      ).filter((e) => !e.hasAttribute('disabled'));
    focusables()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') setModal(null);
      if (e.key === 'Tab') {
        const fs = focusables();
        const first = fs[0],
          last = fs[fs.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [modal, step]);
  function go(p: string) {
    if (p === 'garage') p = 'dashboard/garage';
    p = canonicalPage(role, p);
    if (p.startsWith('dashboard/') && !role) p = 'login';
    if (p.startsWith('dashboard/') && role && !canVisit(role, p)) p = 'dashboard/overview';
    setPage(p);
    location.hash = p;
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  useEffect(() => {
    const change = () => {
      const raw = location.hash.slice(1) || 'home';
      let p = canonicalPage(role, raw);
      if (p.startsWith('dashboard/') && !role) p = 'login';
      else if (p.startsWith('dashboard/') && role && !canVisit(role, p)) p = 'dashboard/overview';
      if (!['home', 'find', 'login', 'register', 'forgot'].includes(p) && !p.startsWith('dashboard/') && !/^professional\/[^/]+$/.test(p))
        p = 'home';
      setPage(p);
      if (canonicalPage(role, raw) !== raw) location.hash = p;
    };
    window.addEventListener('hashchange', change);
    change();
    return () => window.removeEventListener('hashchange', change);
  }, [role]);
  function login(r: Role, register = false, details: any = {}) {
    if (r === 'customer' || r === 'mechanic') {
      try {
        const saved = update((d: any) => applyAccountDetails(d, r, details));
        if (saved === false) {
          setToast(storageFailureMessage);
          return;
        }
      } catch (error: any) {
        setToast(error?.message || storageFailureMessage);
        return;
      }
    }
    setRole(r);
    try {
      sessionStorage.setItem('verifi-demo-role', r);
    } catch {}
    if (pending && r === 'customer') {
      setPage('find');
      location.hash = 'find';
      setModal(pending);
      setStep(1);
      setPending(null);
    } else {
      const next =
        register && r === 'mechanic' ? 'dashboard/profile/business' : 'dashboard/overview';
      setPage(next);
      location.hash = next;
    }
    window.scrollTo(0, 0);
  }
  function logout() {
    setRole(null);
    setModal(null);
    setPending(null);
    try {
      sessionStorage.removeItem('verifi-demo-role');
    } catch {}
    setPage('login');
    location.hash = 'login';
    window.scrollTo(0, 0);
  }
  function anchor(id: string) {
    const fromHome = page === 'home';
    setMenu(false);
    if ((location.hash.slice(1) || 'home') !== 'home') location.hash = 'home';
    setPage('home');
    setSectionTarget((current) => ({ id, nonce: (current?.nonce ?? 0) + 1, smooth: fromHome }));
  }
  useEffect(() => {
    if (!sectionTarget || page !== 'home') {
      if (sectionTarget) handledSection.current = sectionTarget.nonce;
      return;
    }
    if (handledSection.current === sectionTarget.nonce) return;
    const { id, nonce, smooth } = sectionTarget;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = smooth && !reduced ? 'smooth' : 'auto';
    let cancelled = false;
    let frame = 0;
    let timer = 0;
    let tries = 0;

    const finish = () => {
      handledSection.current = nonce;
      stop();
    };
    const stop = () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener('wheel', onUserScroll, true);
      window.removeEventListener('touchmove', onUserScroll, true);
      window.removeEventListener('keydown', onUserKey, true);
    };
    const onUserScroll = () => {
      window.scrollTo({ top: window.scrollY, behavior: 'auto' });
      finish();
    };
    const onUserKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return;
        }
        if (event.key === ' ' && (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY')) return;
      }
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        return;
      onUserScroll();
    };
    const align = (mode: ScrollBehavior) => {
      if (cancelled) return false;
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: mode, block: 'start' });
      return true;
    };
    const correctOnce = () => {
      if (cancelled || behavior === 'smooth') {
        finish();
        return;
      }
      const el = document.getElementById(id);
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      const top = el?.getBoundingClientRect().top ?? 0;
      if (el && (top < headerBottom - 2 || top > headerBottom + 48)) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      finish();
    };
    const waitForTarget = () => {
      if (cancelled) return;
      if (align(behavior)) {
        timer = window.setTimeout(correctOnce, behavior === 'smooth' ? 400 : 160);
        return;
      }
      if (tries++ < 24) frame = requestAnimationFrame(waitForTarget);
      else finish();
    };

    window.addEventListener('wheel', onUserScroll, { capture: true, passive: true });
    window.addEventListener('touchmove', onUserScroll, { capture: true, passive: true });
    window.addEventListener('keydown', onUserKey, true);
    frame = requestAnimationFrame(waitForTarget);
    return () => stop();
  }, [page, sectionTarget]);
  function book(p: any) {
    setDate('');
    setTime('09:00');
    setVehicleId('');
    setDescription('');
    setRequestId(crypto.randomUUID());
    setStep(1);
    if (role !== 'customer') {
      setModal(null);
      setPending(p);
      setPage('login');
      location.hash = 'login';
      setToast(
        role
          ? 'Enter the customer preview to book a professional.'
          : 'Sign in to continue your booking.',
      );
      window.scrollTo(0, 0);
      return;
    }
    setModal(p);
  }
  const directory = directoryEntries(providers, data);
  const results = directory.filter(
    (p) =>
      (city === 'All locations' || p.area === city) &&
      (type === 'Either' || p.type === type) &&
      (service === 'All services' || service === 'Not sure yet' || p.special.includes(service)),
  );
  const customerName =
    role === 'customer' && typeof data.settings?.name === 'string' ? data.settings.name.trim() : '';
  const accountLabel = customerName || 'My account';
  const showWorkspace = page.startsWith('dashboard/') && role !== null && canVisit(role, page);
  useEffect(() => {
    if (showWorkspace) setMenu(false);
  }, [showWorkspace]);
  return (
    <>
      {!showWorkspace && (
        <PublicHeader
          accountLabel={accountLabel}
          anchor={anchor}
          go={go}
          logout={logout}
          menu={menu}
          page={page}
          role={role}
          setMenu={setMenu}
          setTheme={setTheme}
          theme={theme}
        />
      )}
      {['login', 'register', 'forgot'].includes(page) ? (
        <Auth mode={page} role={role} setRole={setRole} onLogin={login} go={go} pending={pending} />
      ) : showWorkspace ? (
        <Workspace
          role={role}
          tab={page.startsWith('dashboard/') ? page.slice('dashboard/'.length) : ''}
          go={go}
          logout={logout}
          data={data}
          update={update}
          notify={setToast}
          theme={theme}
          setTheme={setTheme}
          directory={{
            book,
            city,
            results,
            service,
            setCity,
            setModal,
            setService,
            setStep,
            setType,
            type,
          }}
        />
      ) : page === 'home' ? (
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
      ) : page === 'find' ? (
        <ProfessionalsPage
          book={book}
          city={city}
          go={go}
          results={results}
          service={service}
          setCity={setCity}
          setModal={setModal}
          setService={setService}
          setStep={setStep}
          setType={setType}
          type={type}
        />
      ) : page.startsWith('professional/') ? (
        safeRouteId(page.slice('professional/'.length)) ? (
        <ProfessionalProfilePage
          book={book}
          data={data}
          go={go}
          notify={setToast}
          professionalId={safeRouteId(page.slice('professional/'.length)) || ''}
          role={role}
          update={update}
        />
        ) : (
          <main className="page-wrap">
            <h1>This link is not valid</h1>
            <p>The professional address could not be read.</p>
          </main>
        )
      ) : null}
      {!page.startsWith('dashboard/') && (
        <PublicFooter anchor={anchor} go={go} setModal={setModal} />
      )}
      {modal && (
        <BookingDialog
          anchor={anchor}
          customerId={data.settings?.id}
          date={date}
          description={description}
          go={go}
          modal={modal}
          notify={setToast}
          requestId={requestId}
          setDate={setDate}
          setDescription={setDescription}
          setModal={setModal}
          setRequestId={setRequestId}
          setStep={setStep}
          setTime={setTime}
          setVehicleId={setVehicleId}
          step={step}
          time={time}
          update={update}
          vehicleId={vehicleId}
          vehicles={data.vehicles}
        />
      )}
      {toast && (
        <div role="status" aria-live="polite" className="toast">
          {toast}
        </div>
      )}
    </>
  );
}
