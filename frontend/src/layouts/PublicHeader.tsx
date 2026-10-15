import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { publicSections } from '../config/navigation';
import type { Role } from '../types/roles';
import {
  ArrowUpRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  X,
} from 'lucide-react';

export type PublicHeaderProps = {
  accountLabel: string;
  anchor: (id: string) => void;
  go: (page: string) => void;
  logout: () => void;
  menu: boolean;
  page: string;
  role: Role | null;
  setMenu: (open: boolean) => void;
  setTheme: (theme: string) => void;
  theme: string;
};

type AccountMenuProps = {
  label: string;
  menu: boolean;
  onDashboard: () => void;
  onLogout: () => void;
};

function AccountMenu({ label, menu, onDashboard, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const menuWasOpen = useRef(menu);

  useEffect(() => {
    if (menuWasOpen.current && !menu) setOpen(false);
    menuWasOpen.current = menu;
  }, [menu]);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div className="account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`${label}, account menu`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="account-id">
          <User size={16} aria-hidden="true" />
          <span className="account-label">{label}</span>
        </span>
        <ChevronDown className="chevron" size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="account-menu"
          onKeyDown={onMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDashboard();
              triggerRef.current?.focus();
            }}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Dashboard
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Presentational view. State and actions are supplied by the owning layout. */
export function PublicHeader({
  accountLabel,
  anchor,
  go,
  logout,
  menu,
  page,
  role,
  setMenu,
  setTheme,
  theme,
}: PublicHeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1231px)');
    const onChange = () => {
      if (desktop.matches) setMenu(false);
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, [setMenu]);

  useEffect(() => {
    if (!menu) return;
    const collapsed = window.matchMedia('(max-width: 1230px)');
    if (!collapsed.matches) return;
    const roots = Array.from(document.querySelectorAll('main, footer'));
    roots.forEach((el) => el.setAttribute('inert', ''));
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenu(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenu(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      roots.forEach((el) => el.removeAttribute('inert'));
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menu, setMenu]);

  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={() => go('home')} aria-label="Verifi Auto home">
        <span className="brand-icon">
          <img src="/logo.png" alt="" />
        </span>
        verifi<span className="brand-auto">auto</span>
        <i />
      </button>
      <div id="site-menu" ref={menuRef} className={menu ? 'site-menu open' : 'site-menu'}>
        <nav aria-label="Page sections">
          {publicSections.map((item) => (
            <button type="button" key={item.id} onClick={() => anchor(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button
            className="theme"
            type="button"
            onClick={() => {
              setTheme(nextTheme);
              setMenu(false);
            }}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            {theme === 'dark' ? (
              <Sun size={19} aria-hidden="true" />
            ) : (
              <Moon size={19} aria-hidden="true" />
            )}
            <span className="theme-label" aria-hidden="true">
              {nextTheme === 'light' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
          <button
            className={page === 'find' ? 'join active' : 'join'}
            type="button"
            aria-current={page === 'find' ? 'page' : undefined}
            onClick={() => go('find')}
          >
            Find a professional <Search size={15} aria-hidden="true" />
          </button>
          {role ? (
            <AccountMenu
              label={accountLabel}
              menu={menu}
              onDashboard={() => go('dashboard/overview')}
              onLogout={() => {
                setMenu(false);
                logout();
                requestAnimationFrame(() => {
                  const signIn = document.querySelector<HTMLButtonElement>('.site-header .nav-signin');
                  if (signIn && signIn.offsetParent !== null) signIn.focus();
                  else menuButtonRef.current?.focus();
                });
              }}
            />
          ) : (
            <button className="nav-signin" type="button" onClick={() => go('login')}>
              Sign in <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <button
        ref={menuButtonRef}
        className="mobile-menu"
        type="button"
        onClick={() => setMenu(!menu)}
        aria-expanded={menu}
        aria-controls="site-menu"
        aria-label={menu ? 'Close navigation' : 'Open navigation'}
      >
        {menu ? <X /> : <Menu />}
      </button>
    </header>
  );
}
