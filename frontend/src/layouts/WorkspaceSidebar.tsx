import { icons } from '../config/workspaceIcons';
import { Card } from '../components/ui/Card';

import { ArrowUpRight, ShieldCheck, LogOut } from 'lucide-react';
import { Role, roleLabel, navItems } from '../demo';

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceSidebar({ go, logout, role, route, side, tab, unread }: any) {
  return (
    <aside className={'sidebar ' + (side ? 'expanded' : '')}>
      <div className="workspace-tag">
        <span className="avatar">
          {role === 'customer' ? 'AM' : role === 'mechanic' ? 'VA' : 'AD'}
        </span>
        <div>
          <b>{roleLabel[role as Role]}</b>
          <small>Demo workspace</small>
        </div>
      </div>
      <div className="sidebar-label">WORKSPACE</div>
      {navItems[role as Role].map(([id, label]) => {
        const Icon = icons[id];
        return (
          <button className={tab === id ? 'selected' : ''} key={id} onClick={() => route(id)}>
            <Icon size={18} />
            {label}
            {id === 'notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
          </button>
        );
      })}
      <div className="sidebar-bottom">
        <Card as="div" className="sidebar-help">
          <ShieldCheck size={22} />
          <b>Clarity at every step.</b>
          <p>Explore the journey with sample accounts and data.</p>
        </Card>
        <button onClick={() => go('home')}>
          <ArrowUpRight size={17} />
          Visit website
        </button>
        <button onClick={logout}>
          <LogOut size={17} />
          Sign out / switch preview
        </button>
      </div>
    </aside>
  );
}
