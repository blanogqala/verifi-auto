import { useEffect, useState } from 'react';
import { icons } from '../config/workspaceIcons';
import {
  adminIdentityLabel,
  customerIdentityLabel,
  customerInitials,
  merchantIdentityLabel,
} from '../features/account/customerIdentity';
import { adminProfileSection, isNavGroup, merchantProfileSection, navItems } from '../config/navigation';
import { ChevronRight, LogOut, X } from 'lucide-react';
import { Role } from '../demo';

export type WorkspaceSidebarProps = {
  accountName?: string;
  accountPhoto?: string;
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

function itemSelected(id: string, tab: string) {
  if (tab === id) return true;
  if (id === 'find' && tab.startsWith('find/')) return true;
  if (id === 'bookings' && tab.startsWith('bookings/')) return true;
  if (id === 'garage' && tab.startsWith('garage/')) return true;
  if (id === 'applications' && tab.startsWith('applications/')) return true;
  if (id === 'reports' && (tab === 'reports' || tab.startsWith('reports/'))) return true;
  if (id === 'jobs' && (tab === 'jobs' || tab.startsWith('jobs/'))) return true;
  if (id.startsWith('appointments') && tab.startsWith('appointments')) return true;
  return false;
}

function NavButton({
  id,
  label,
  onClick,
  selected,
  tabIndex,
  unread,
}: {
  id: string;
  label: string;
  onClick: () => void;
  selected: boolean;
  tabIndex?: number;
  unread: number;
}) {
  const Icon = icons[id];
  return (
    <button
      type="button"
      className={'nav-item' + (selected ? ' selected' : '')}
      aria-current={selected ? 'page' : undefined}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      {Icon ? <Icon size={18} /> : null}
      {label}
      {id === 'notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
    </button>
  );
}

function UsersGroup({
  items,
  route,
  tab,
  unread,
}: {
  items: [string, string][];
  route: (tab: string) => void;
  tab: string;
  unread: number;
}) {
  const activeChild = items.some(([id]) => tab === id);
  const [open, setOpen] = useState(activeChild);
  const UsersIcon = icons.users;
  useEffect(() => {
    if (activeChild) setOpen(true);
  }, [tab, activeChild]);
  return (
    <div className="nav-group">
      <button
        type="button"
        className={'nav-item nav-parent' + (activeChild ? ' nav-parent-active' : '')}
        aria-expanded={open}
        aria-controls="nav-users-items"
        onClick={() => setOpen((current) => !current)}
      >
        {UsersIcon ? <UsersIcon size={18} /> : null}
        Users
        <ChevronRight className="nav-chevron" size={16} aria-hidden="true" />
      </button>
      <div id="nav-users-items" className="nav-children" hidden={!open} inert={!open ? true : undefined}>
        {items.map(([id, label]) => (
          <NavButton
            key={id}
            id={id}
            label={label}
            selected={tab === id}
            tabIndex={open ? undefined : -1}
            unread={unread}
            onClick={() => route(id)}
          />
        ))}
      </div>
    </div>
  );
}

/** Presentational view. State and actions are supplied by the owning layout. */
export function WorkspaceSidebar({
  accountName = '',
  accountPhoto = '',
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
  const customer = role === 'customer';
  const merchant = role === 'mechanic';
  const admin = role === 'admin';
  const identity = merchant
    ? merchantIdentityLabel(accountName)
    : admin
      ? adminIdentityLabel(accountName)
      : customerIdentityLabel(accountName);
  const initials = customerInitials(accountName);
  const profileActive = customer
    ? tab === 'profile'
    : merchant
      ? merchantProfileSection(tab) !== null
      : adminProfileSection(tab) !== null;
  const profileTarget = merchant ? 'profile/business' : admin ? 'profile/account' : 'profile';
  const subtitle = merchant ? 'Mechanic' : admin ? 'Platform admin' : 'Customer';
  return (
    <aside
      id="workspace-sidebar"
      className={'sidebar' + (side ? ' expanded' : '')}
      role={dialog ? 'dialog' : undefined}
      aria-modal={dialog ? true : undefined}
      aria-label={dialog ? 'Workspace navigation' : undefined}
      tabIndex={dialog ? -1 : undefined}
      inert={drawer && !side ? true : undefined}
    >
      <div className="sidebar-head">
        <button
          type="button"
          className="sidebar-brand"
          onClick={goHome}
          aria-label="Verifi Auto home"
        >
          <span className="brand-icon">
            <img src="/logo.png" alt="" />
          </span>
          verifi<span className="brand-auto">auto</span>
          <i />
        </button>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>
      <div className="workspace-tag">
        <button
          type="button"
          className={'workspace-identity' + (profileActive ? ' active' : '')}
          aria-current={profileActive ? 'page' : undefined}
          onClick={() => route(profileTarget)}
        >
          <span className="avatar" aria-hidden="true">
            {accountPhoto ? <img src={accountPhoto} alt="" /> : initials}
          </span>
          <span className="workspace-identity-text">
            <b title={identity}>{identity}</b>
            <small>{subtitle}</small>
          </span>
        </button>
      </div>
      <div className="sidebar-scroll">
        <div className="sidebar-label">WORKSPACE</div>
        {navItems[role].map((entry) => {
          if (isNavGroup(entry)) {
            return (
              <UsersGroup
                key={entry.id}
                route={route}
                tab={tab}
                unread={unread}
                items={entry.children}
              />
            );
          }
          const [id, label] = entry;
          return (
            <NavButton
              key={id}
              id={id}
              label={label}
              selected={itemSelected(id, tab)}
              unread={unread}
              onClick={() => route(id)}
            />
          );
        })}
      </div>
      <div className="sidebar-bottom">
        <button type="button" onClick={logout}>
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
