import { ArrowUpRight, Sun, Moon, Menu, X } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function PublicHeader({ anchor, go, menu, page, role, setMenu, setTheme, theme }: any) {
  return (
    <header>
      <button className="brand" onClick={() => go('home')} aria-label="Verifi Auto home">
        <span className="brand-icon">
          <img src="/logo.png" alt="" />
        </span>
        verifi<span className="brand-auto">auto</span>
        <i />
      </button>
      <nav className={menu ? 'open' : ''}>
        <button onClick={() => go('find')} className={page === 'find' ? 'active' : ''}>
          Find a professional
        </button>
        <button onClick={() => anchor('how')}>How it works</button>
        <button onClick={() => anchor('trust')}>Our standard</button>
        <button
          onClick={() => go(role ? 'dashboard/overview' : 'login')}
          className={page.startsWith('dashboard/') ? 'active' : ''}
        >
          Dashboard
        </button>
      </nav>
      <div className="nav-actions">
        <button
          className="theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button className="join" onClick={() => go('register')}>
          For professionals <ArrowUpRight size={15} />
        </button>
        <button className="nav-signin" onClick={() => go(role ? 'dashboard/overview' : 'login')}>
          {role ? 'My workspace' : 'Sign in'} <ArrowUpRight size={15} />
        </button>
        <button
          className="mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-label="Toggle navigation"
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
