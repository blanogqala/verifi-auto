import { Menu, Bell, ChevronRight } from 'lucide-react';
import { Role, roleLabel } from '../demo';

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceTopbar({ heading, role, route, setSide, side, unread }: any) {
  return (
    <div className="workspace-top">
      <button
        className="workspace-menu"
        onClick={() => setSide(!side)}
        aria-label="Toggle workspace navigation"
      >
        <Menu size={20} />
      </button>
      <span>
        {roleLabel[role as Role]} workspace <ChevronRight size={13} /> {heading}
      </span>
      <div>
        <span className="chip">DEMO DATA</span>
        <button
          aria-label="Notifications"
          onClick={() => (role === 'admin' ? route('reports') : route('notifications'))}
        >
          <Bell size={19} />
          {unread > 0 && <i />}
        </button>
        <span className="avatar small">
          {role === 'admin' ? 'AD' : role === 'mechanic' ? 'VA' : 'AM'}
        </span>
      </div>
    </div>
  );
}
