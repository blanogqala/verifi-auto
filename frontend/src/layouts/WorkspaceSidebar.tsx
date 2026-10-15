import { icons } from '../config/workspaceIcons';
import { Card } from '../components/ui/Card';

import { ArrowUpRight, ShieldCheck, LogOut, X } from 'lucide-react';
import { Role, roleLabel, navItems } from '../demo';

export type WorkspaceSidebarProps = {
  goHome: () => void;
  logout: () => void;
  onClose: () => void;
  role: Role;
  route: (tab: string) => void;
  side: boolean;
  tab: string;
  unread: number;
  drawer: boolean;
};

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceSidebar({
  goHome,
  logout,
  onClose,
  role,
  route,
  side,
  tab,
  unread,
  drawer,
}: WorkspaceSidebarProps) {
  const dialog = drawer && side;
  return (
    <aside
      id="workspace-sidebar"
      className={'sidebar' + (side ? ' expanded' : '')}
      role={dialog ? 'dialog' : undefined}
      aria-modal={dialog ? true : undefined}
      aria-label={dialog ? 'Workspace navigation' : undefined}
      tabIndex={dialog ? -1 : undefined}
    >
      <div className="sidebar-head">
        <button type="button" className="sidebar-brand" onClick={goHome} aria-label="Verifi Auto home">
          <span className="brand-icon">
            <img src="/logo.png" alt="" />
          </span>
          verifi<span className="brand-auto">auto</span>
          <i />
        </button>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>
      <div className="workspace-tag">
        <span className="avatar">
          {role === 'customer' ? 'AM' : role === 'mechanic' ? 'VA' : 'AD'}
        </span>
        <div>
          <b>{roleLabel[role]}</b>
          <small>Demo workspace</small>
        </div>
      </div>
      <div className="sidebar-scroll">
        <div className="sidebar-label">WORKSPACE</div>
        {navItems[role].map(([id, label]) => {
          const Icon = icons[id];
          return (
            <button
              type="button"
              className={tab === id ? 'selected' : ''}
              key={id}
              onClick={() => route(id)}
            >
              <Icon size={18} />
              {label}
              {id === 'notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
            </button>
          );
        })}
      </div>
      <div className="sidebar-bottom">
        <Card as="div" className="sidebar-help">
          <ShieldCheck size={22} />
          <b>Clarity at every step.</b>
          <p>Explore the journey with sample accounts and data.</p>
        </Card>
        <button type="button" onClick={goHome}>
          <ArrowUpRight size={17} />
          Visit website
        </button>
        <button type="button" onClick={logout}>
          <LogOut size={17} />
          Sign out / switch preview
        </button>
      </div>
    </aside>
  );
}
