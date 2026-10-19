import { photo, shop } from './config/assets';
import { demoAreaByLabel } from './data/demoAreas';
import { providers } from './data/professionals';
import { clearBookingDraft, readBookingDraft, writeBookingDraft } from './features/booking/bookingDraft';
import { discoveryWithArea, browseDirectory, type DiscoverySession } from './features/professionals/discovery';
import { readDiscoverySession, writeDiscoverySession } from './features/professionals/discoveryState';
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
  const openingDraft = readBookingDraft();
  const [pending, setPending] = useState<any>(openingDraft?.professional ?? null);
  const [menu, setMenu] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoverySession>(() => {
    const saved = readDiscoverySession();
    if (saved.origin) return saved;
    const area = role === 'customer' ? demoAreaByLabel(data.settings?.city || '') : null;
    return area ? discoveryWithArea(saved, area.id) : saved;
  });
  const [modal, setModal] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(openingDraft?.date || '');
  const [time, setTime] = useState(openingDraft?.time || '09:00');
  const [vehicleId, setVehicleId] = useState(openingDraft?.vehicleId || '');
  const [description, setDescription] = useState(openingDraft?.description || '');
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
    document.documentElement.classList.add('scroll-lock');
    const el = document.querySelector('.modal') as HTMLElement;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]'),
      ).filter((e) => !e.hasAttribute('disabled'));
    focusables()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (modal && typeof modal === 'object' && role === 'customer') {
          clearBookingDraft();
          setPending(null);
        }
        setModal(null);
      }
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
      document.documentElement.classList.remove('scroll-lock');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [modal, step]);
  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches('input, textarea, select')) return;
      if (target instanceof HTMLInputElement && ['checkbox', 'radio', 'range', 'color', 'file', 'hidden', 'button', 'submit'].includes(target.type))
        return;
      if (!window.matchMedia('(max-width: 900px)').matches) return;
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
      }, 280);
    }
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
  function go(p: string) {
    if (p === 'garage') p = 'dashboard/garage';
    p = canonicalPage(role, p);
    if (p.startsWith('dashboard/') && !role) p = 'login';
    if (p.startsWith('dashboard/') && role && !canVisit(role, p)) p = 'dashboard/overview';
    setPage(p);
    location.hash = p;
    setMenu(false);
    if (!modal) document.documentElement.classList.remove('scroll-lock');
    document.body.style.overflow = '';
    window.scrollTo({ top: 0, behavior: p === 'find' ? 'auto' : 'smooth' });
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
      document.body.style.overflow = '';
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
      const draft = readBookingDraft();
      if (draft) {
        setVehicleId(draft.vehicleId);
        setDate(draft.date);
        setTime(draft.time || '09:00');
        setDescription(draft.description);
      }
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
    const draft = readBookingDraft();
    const same = draft?.professional?.id && p?.id && draft.professional.id === p.id;
    const next = {
      professional: {
        id: p?.id || '',
        name: p?.name || '',
        area: p?.place || p?.area || '',
        type: p?.type || '',
        special: p?.special || '',
      },
      vehicleId: same ? draft?.vehicleId || '' : '',
      date: same ? draft?.date || '' : '',
      time: same ? draft?.time || '09:00' : '09:00',
      description: same ? draft?.description || '' : '',
    };
    setDate(next.date);
    setTime(next.time);
    setVehicleId(next.vehicleId);
    setDescription(next.description);
    setRequestId(crypto.randomUUID());
    setStep(1);
    writeBookingDraft(next);
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
    setModal(next.professional);
  }
  useEffect(() => {
    writeDiscoverySession(discovery);
  }, [discovery]);
  useEffect(() => {
    if (step === 2) clearBookingDraft();
  }, [step]);
  useEffect(() => {
    if (!modal || typeof modal !== 'object') return;
    writeBookingDraft({
      professional: {
        id: modal.id || '',
        name: modal.name || '',
        area: modal.area || '',
        type: modal.type || '',
        special: modal.special || '',
      },
      vehicleId,
      date,
      time,
      description,
    });
  }, [modal, vehicleId, date, time, description]);
  const listed = directoryEntries(providers, data);
  const results = browseDirectory(listed, discovery, data);
  function setService(service: string) {
    setDiscovery((current) => ({ ...current, service }));
  }
  function setType(type: string) {
    setDiscovery((current) => ({ ...current, type }));
  }
  const customerName =
    role === 'customer' && typeof data.settings?.name === 'string' ? data.settings.name.trim() : '';
  const accountLabel = customerName || 'My account';
  const showWorkspace = page.startsWith('dashboard/') && role !== null && canVisit(role, page);
  useEffect(() => {
    if (showWorkspace) setMenu(false);
  }, [showWorkspace]);
  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="logo-matte" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  2.2 2.2 2.2 0 -0.25"
          />
        </filter>
      </svg>
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
            discovery,
            results,
            service: discovery.service,
            setDiscovery,
            setService,
            setType,
            type: discovery.type,
          }}
        />
      ) : page === 'home' ? (
        <LandingPage
          anchor={anchor}
          city={discovery.areaId}
          go={go}
          photo={photo}
          service={discovery.service}
          setCity={(areaId: string) => setDiscovery((current) => discoveryWithArea(current, areaId))}
          setService={setService}
          setType={setType}
          shop={shop}
          type={discovery.type}
        />
      ) : page === 'find' ? (
        <ProfessionalsPage
          book={book}
          discovery={discovery}
          go={go}
          results={results}
          service={discovery.service}
          setDiscovery={setDiscovery}
          setService={setService}
          setType={setType}
          type={discovery.type}
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
          setModal={(value: any) => {
            if (!value && modal && typeof modal === 'object' && role === 'customer') {
              clearBookingDraft();
              setPending(null);
            }
            setModal(value);
          }}
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
