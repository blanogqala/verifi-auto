import type { RefObject } from 'react';
import { Menu, Bell, ChevronRight, Sun, Moon } from 'lucide-react';
import { customerInitials } from '../features/account/customerIdentity';
import { Role, roleLabel } from '../demo';

export type WorkspaceTopbarProps = {
  accountName?: string;
  heading: string;
  role: Role;
  route: (tab: string) => void;
  setSide: (open: boolean) => void;
  side: boolean;
  tab: string;
  unread: number;
  theme: string;
  setTheme: (theme: string) => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
};

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceTopbar({
  accountName = '',
  heading,
  role,
  route,
  setSide,
  side,
  tab,
  unread,
  theme,
  setTheme,
  menuButtonRef,
}: WorkspaceTopbarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const customer = role === 'customer';
  const profileActive = customer && tab === 'profile';
  const notificationsActive = customer && tab === 'notifications';
  return (
    <div className="workspace-top">
      <button
        ref={menuButtonRef}
        type="button"
        className="workspace-menu"
        onClick={() => setSide(!side)}
        aria-expanded={side}
        aria-controls="workspace-sidebar"
        aria-label={side ? 'Close workspace navigation' : 'Open workspace navigation'}
      >
        <Menu size={20} />
      </button>
      <span>
        {roleLabel[role]} workspace <ChevronRight size={13} /> {heading}
      </span>
      <div>
        <span className="chip">DEMO DATA</span>
        <button
          type="button"
          className="theme"
          onClick={() => setTheme(nextTheme)}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          className={
            customer ? 'customer-notify' + (notificationsActive ? ' active' : '') : undefined
          }
          aria-label="Notifications"
          aria-current={notificationsActive ? 'page' : undefined}
          onClick={() => (role === 'admin' ? route('reports') : route('notifications'))}
        >
          <Bell size={19} />
          {unread > 0 && <i />}
        </button>
        {customer ? (
          <button
            type="button"
            className={'avatar small profile-link' + (profileActive ? ' active' : '')}
            aria-label="Open profile"
            aria-current={profileActive ? 'page' : undefined}
            onClick={() => route('profile')}
          >
            {customerInitials(accountName)}
          </button>
        ) : (
          <span className="avatar small">{role === 'admin' ? 'AD' : 'VA'}</span>
        )}
      </div>
    </div>
  );
}
