import { photo, shop } from './config/assets';
import { providers } from './data/professionals';
import { PublicHeader } from './layouts/PublicHeader';
import { LandingPage } from './pages/public/LandingPage';
import { ProfessionalsPage } from './pages/public/ProfessionalsPage';
import { PublicFooter } from './layouts/PublicFooter';
import { BookingDialog } from './components/booking/BookingDialog';
import { useState, useEffect, useRef } from 'react';

import { Workspace } from './layouts/WorkspaceLayout';
import { AuthPage as Auth } from './pages/auth/AuthPage';
import { Role, roles, canVisit, canonicalPage, useDemoStore } from './demo';

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
  const [bookings, setBookings] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [vehicle, setVehicle] = useState('');
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
      if (
        !['home', 'find', 'login', 'register', 'forgot'].includes(p) &&
        !p.startsWith('dashboard/')
      )
        p = 'home';
      setPage(p);
      if (canonicalPage(role, raw) !== raw) location.hash = p;
    };
    window.addEventListener('hashchange', change);
    change();
    return () => window.removeEventListener('hashchange', change);
  }, [role]);
  function login(r: Role, register = false, details: any = {}) {
    setRole(r);
    if (r === 'customer')
      update((d: any) => ({
        ...d,
        settings: {
          ...d.settings,
          ...(details.name ? { name: details.name } : {}),
          ...(details.email ? { email: details.email } : {}),
        },
      }));
    try {
      sessionStorage.setItem('verifi-demo-role', r);
    } catch {}
    if (pending && r === 'customer') {
      setPage('find');
      location.hash = 'find';
      setModal(pending);
      setStep(0);
      setPending(null);
    } else {
      const next = register && r === 'mechanic' ? 'dashboard/profile' : 'dashboard/overview';
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
    setStep(0);
    setDate('');
    setVehicle('');
  }
  const directory = [
    ...providers.filter(
      (p) => !data.reviews.some((a: any) => a.name === p.name && a.status !== 'Approved'),
    ),
    ...(data.application.status === 'Approved'
      ? [
          {
            name: data.profile.name,
            type: data.profile.type,
            area: data.profile.city,
            special: data.profile.services.join(' · '),
            fee: data.profile.fee,
          },
        ]
      : []),
  ];
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
          tab={page.split('/')[1]}
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
          results={results}
          service={service}
          setCity={setCity}
          setModal={setModal}
          setService={setService}
          setStep={setStep}
          setType={setType}
          type={type}
        />
      ) : null}
      {!page.startsWith('dashboard/') && (
        <PublicFooter anchor={anchor} go={go} setModal={setModal} />
      )}
      {modal && (
        <BookingDialog
          anchor={anchor}
          book={book}
          bookings={bookings}
          date={date}
          go={go}
          modal={modal}
          role={role}
          setBookings={setBookings}
          setDate={setDate}
          setModal={setModal}
          setStep={setStep}
          setTime={setTime}
          setVehicle={setVehicle}
          step={step}
          time={time}
          type={type}
          update={update}
          vehicle={vehicle}
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
