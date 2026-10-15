import { Role } from '../types/roles';

export type PublicSection = {
  id: string;
  label: string;
};

export const publicSections: PublicSection[] = [
  { id: 'services', label: 'Services' },
  { id: 'trust', label: 'Our standard' },
  { id: 'service-options', label: 'Service options' },
  { id: 'vehicle-history', label: 'Vehicle history' },
  { id: 'how', label: 'How it works' },
  { id: 'faq', label: 'FAQs' },
];

export const roles: Role[] = ['customer', 'mechanic', 'admin'];
export const roleLabel = { customer: 'Customer', mechanic: 'Mechanic', admin: 'Platform admin' };
export const navItems = {
  customer: [
    ['overview', 'Overview'],
    ['find', 'Find a Professional'],
    ['bookings', 'My bookings'],
    ['garage', 'My Garage'],
    ['payments', 'Payments'],
  ],
  mechanic: [
    ['overview', 'Overview'],
    ['jobs', 'Appointments & jobs'],
    ['quotes', 'Quotes & invoices'],
    ['profile', 'Business profile'],
    ['documents', 'Documents'],
    ['application', 'Verification status'],
    ['notifications', 'Notifications'],
    ['settings', 'Account settings'],
  ],
  admin: [
    ['overview', 'Overview'],
    ['applications', 'Applications'],
    ['professionals', 'Professionals'],
    ['jobs', 'Jobs & activity'],
    ['reports', 'Reports & support'],
    ['settings', 'Platform settings'],
  ],
};

/** Dashboard routes a role may open. This is separate from the visible sidebar. */
export const allowedDashboardPages: Record<Role, string[]> = {
  customer: [
    'overview',
    'find',
    'bookings',
    'garage',
    'payments',
    'quotes',
    'notifications',
    'profile',
  ],
  mechanic: navItems.mechanic.map(([id]) => id),
  admin: navItems.admin.map(([id]) => id),
};

const hiddenPageTitles: Partial<Record<Role, Record<string, string>>> = {
  customer: {
    quotes: 'Quotes & approvals',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Profile',
  },
};

export function pageTitle(role: Role, tab: string) {
  const visible = navItems[role].find(([id]) => id === tab);
  if (visible) return visible[1];
  return hiddenPageTitles[role]?.[tab] ?? 'Overview';
}
