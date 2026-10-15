import type { RefObject } from 'react';
import { Menu, Bell, ChevronRight, Sun, Moon } from 'lucide-react';
import { Role, roleLabel } from '../demo';

export type WorkspaceTopbarProps = {
  heading: string;
  role: Role;
  route: (tab: string) => void;
  setSide: (open: boolean) => void;
  side: boolean;
  unread: number;
  theme: string;
  setTheme: (theme: string) => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
};

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceTopbar({
  heading,
  role,
  route,
  setSide,
  side,
  unread,
  theme,
  setTheme,
  menuButtonRef,
}: WorkspaceTopbarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
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
          aria-label="Notifications"
          onClick={() => (role === 'admin' ? route('reports') : route('notifications'))}
        >
          <Bell size={19} />
          {unread > 0 && <i />}
        </button>
        <span className="avatar small">{role === 'admin' ? 'AD' : role === 'mechanic' ? 'VA' : 'AM'}</span>
      </div>
    </div>
  );
}
