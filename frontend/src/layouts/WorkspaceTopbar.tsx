import type { RefObject } from 'react';
import { Menu, Bell, ChevronRight, Sun, Moon } from 'lucide-react';
import { customerInitials } from '../features/account/customerIdentity';
import { adminProfileSection, analyticsSection, merchantProfileSection } from '../config/navigation';
import { Role, roleLabel } from '../demo';

export type WorkspaceTopbarProps = {
  accountName?: string;
  accountPhoto?: string;
  heading: string;
  sectionLabel?: string;
  role: Role;
  goHome: () => void;
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
  accountPhoto = '',
  heading,
  sectionLabel = '',
  goHome,
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
  const merchant = role === 'mechanic';
  const admin = role === 'admin';
  const workspaceRole = merchant ? 'Mechanic' : roleLabel[role];
  const profileActive = customer
    ? tab === 'profile'
    : merchant
      ? merchantProfileSection(tab) !== null
      : adminProfileSection(tab) !== null;
  const notificationsActive = tab === 'notifications';
  const notifyClass = customer
    ? 'customer-notify'
    : merchant
      ? 'mechanic-notify'
      : admin
        ? 'admin-notify'
        : '';
  const profileTarget = merchant ? 'profile/business' : admin ? 'profile/account' : 'profile';
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
      <button type="button" className="workspace-mark" onClick={goHome} aria-label="Verifi Auto home">
        <img src="/logo.png" alt="" />
      </button>
      <span className="workspace-crumb">
        {workspaceRole} workspace <ChevronRight size={13} /> {heading}
        {sectionLabel ? (
          <>
            {' '}
            <ChevronRight size={13} /> {sectionLabel}
          </>
        ) : null}
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
          className={notifyClass ? notifyClass + (notificationsActive ? ' active' : '') : undefined}
          aria-label="Notifications"
          aria-current={notificationsActive ? 'page' : undefined}
          onClick={() => route('notifications')}
        >
          <Bell size={19} />
          {unread > 0 && <i />}
        </button>
        <button
          type="button"
          className={'avatar small profile-link' + (profileActive ? ' active' : '')}
          aria-label="Open profile"
          aria-current={profileActive ? 'page' : undefined}
          onClick={() => route(profileTarget)}
        >
          {accountPhoto ? <img src={accountPhoto} alt="" /> : customerInitials(accountName)}
        </button>
      </div>
    </div>
  );
}
