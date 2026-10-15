import { photo, shop } from './config/assets';
import { providers } from './data/professionals';
import { PublicHeader } from './layouts/PublicHeader';
import { LandingPage } from './pages/public/LandingPage';
import { ProfessionalsPage } from './pages/public/ProfessionalsPage';
import { PublicFooter } from './layouts/PublicFooter';
import { BookingDialog } from './components/booking/BookingDialog';
import { useState, useEffect } from 'react';

import { Workspace } from './layouts/WorkspaceLayout';
import { AuthPage as Auth } from './pages/auth/AuthPage';
import { Role, roles, canVisit, useDemoStore } from './demo';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('verifi-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [page, setPage] = useState(() => location.hash.slice(1) || 'home');
  const [role, setRole] = useState<Role | null>(() => {
    try {
      const r = sessionStorage.getItem('verifi-demo-role');
      return roles.includes(r as Role) ? (r as Role) : null;
    } catch {
      return null;
    }
  });
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
    if (p.startsWith('dashboard/') && !role) p = 'login';
    if (p.startsWith('dashboard/') && role && !canVisit(role, p)) p = 'dashboard/overview';
    setPage(p);
    location.hash = p;
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  useEffect(() => {
    const change = () => {
      let p = location.hash.slice(1) || 'home';
      if (p.startsWith('dashboard/') && !role) p = 'login';
      else if (p.startsWith('dashboard/') && role && !canVisit(role, p)) p = 'dashboard/overview';
      if (
        !['home', 'find', 'login', 'register', 'forgot'].includes(p) &&
        !p.startsWith('dashboard/')
      )
        p = 'home';
      setPage(p);
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
    setPage('home');
    location.hash = 'home';
    setMenu(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60);
  }
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
  return (
    <>
      <div className="preview">
        DESIGN PREVIEW <span>Explore with sample data. No real bookings or payments.</span>
      </div>
      <PublicHeader
        anchor={anchor}
        go={go}
        menu={menu}
        page={page}
        role={role}
        setMenu={setMenu}
        setTheme={setTheme}
        theme={theme}
      />
      {['login', 'register', 'forgot'].includes(page) ? (
        <Auth mode={page} role={role} setRole={setRole} onLogin={login} go={go} pending={pending} />
      ) : page.startsWith('dashboard/') && role && canVisit(role, page) ? (
        <Workspace
          role={role}
          tab={page.split('/')[1]}
          go={go}
          logout={logout}
          data={data}
          update={update}
          notify={setToast}
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
