import { Role } from '../types/roles';

export type NavLeaf = [string, string];
export type NavGroup = {
  id: string;
  label: string;
  children: NavLeaf[];
};
export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return !Array.isArray(entry);
}

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
export const merchantProfileSections = [
  'business',
  'documents',
  'banking',
  'verification',
] as const;
export type MerchantProfileSection = (typeof merchantProfileSections)[number];
export const merchantProfileSectionLabel: Record<MerchantProfileSection, string> = {
  business: 'Business profile',
  documents: 'Documents',
  banking: 'Banking details',
  verification: 'Verification status',
};

const legacyMerchantSections: Record<string, MerchantProfileSection> = {
  profile: 'business',
  'profile/account': 'business',
  'profile/business': 'business',
  'profile/documents': 'documents',
  'profile/banking': 'banking',
  'profile/verification': 'verification',
  settings: 'business',
  documents: 'documents',
  application: 'verification',
};

export const appointmentSections = ['pending', 'rejected', 'cancelled'] as const;
export type AppointmentSection = (typeof appointmentSections)[number];

export function appointmentSection(tab: string): AppointmentSection | null {
  if (tab === 'appointments' || tab === 'appointments/pending') return 'pending';
  if (tab === 'appointments/rejected') return 'rejected';
  if (tab === 'appointments/cancelled') return 'cancelled';
  return null;
}

export function merchantProfileSection(tab: string): MerchantProfileSection | null {
  return legacyMerchantSections[tab] ?? null;
}

export const navItems: Record<Role, NavEntry[]> = {
  customer: [
    ['overview', 'Overview'],
    ['find', 'Find a Professional'],
    ['bookings', 'My bookings'],
    ['garage', 'My Garage'],
    ['payments', 'Payments'],
  ],
  mechanic: [
    ['overview', 'Overview'],
    ['appointments/pending', 'Appointments'],
    ['jobs', 'Jobs'],
    ['payments', 'Payments'],
  ],
  admin: [
    ['overview', 'Overview'],
    ['applications', 'Applications'],
    {
      id: 'users',
      label: 'Users',
      children: [
        ['professionals', 'Professionals'],
        ['customers', 'Customers'],
      ],
    },
    ['jobs', 'Jobs & activity'],
    ['reports', 'Analytics & support'],
    ['finance', 'Finance'],
  ],
};

export function navLeaves(role: Role): NavLeaf[] {
  return navItems[role].flatMap((entry) => (isNavGroup(entry) ? entry.children : [entry]));
}

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
  mechanic: [
    'overview',
    'appointments/pending',
    'appointments/rejected',
    'appointments/cancelled',
    'jobs',
    'payments',
    'quotes',
    'notifications',
    'profile/business',
    'profile/documents',
    'profile/banking',
    'profile/verification',
  ],
  admin: [
    'overview',
    'applications',
    'applications/history',
    'professionals',
    'customers',
    'jobs',
    'reports',
    'reports/analytics',
    'reports/security',
    'notifications',
    'reports/support',
    'finance',
    'profile/account',
    'profile/platform',
  ],
};

export const adminProfileSections = ['account', 'platform'] as const;
export type AdminProfileSection = (typeof adminProfileSections)[number];
export const adminProfileSectionLabel: Record<AdminProfileSection, string> = {
  account: 'Profile',
  platform: 'Platform settings',
};

export function adminProfileSection(tab: string): AdminProfileSection | null {
  if (tab === 'profile/platform' || tab === 'settings') return 'platform';
  if (tab === 'profile' || tab === 'profile/account') return 'account';
  return null;
}

export const analyticsSections = ['analytics', 'security', 'support'] as const;
export type AnalyticsSection = (typeof analyticsSections)[number];

export function analyticsSection(tab: string): AnalyticsSection | null {
  if (tab === 'reports/security') return 'security';
  if (tab === 'reports/support') return 'support';
  if (tab === 'reports' || tab === 'reports/analytics') return 'analytics';
  return null;
}

const hiddenPageTitles: Partial<Record<Role, Record<string, string>>> = {
  customer: {
    quotes: 'Quotes & approvals',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Profile',
  },
  mechanic: {
    quotes: 'Quotes & invoices',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Profile',
    documents: 'Profile',
    application: 'Profile',
    appointments: 'Appointments',
  },
  admin: {
    settings: 'Admin profile',
    profile: 'Admin profile',
    'profile/account': 'Admin profile',
    'profile/platform': 'Admin profile',
    'applications/history': 'Applications',
    'reports/analytics': 'Analytics & support',
    'reports/support': 'Analytics & support',
  },
};

export function pageTitle(role: Role, tab: string) {
  const visible = navLeaves(role).find(([id]) => id === tab);
  if (visible) return visible[1];
  if (role === 'mechanic' && (tab.startsWith('profile/') || tab === 'profile')) return 'Profile';
  if (role === 'mechanic' && tab.startsWith('jobs/')) return 'Job';
  if (role === 'mechanic' && tab.startsWith('appointments')) return 'Appointments';
  if (role === 'admin' && (tab === 'profile' || tab.startsWith('profile/') || tab === 'settings'))
    return 'Admin profile';
  if (role === 'admin' && tab.startsWith('reports')) return 'Analytics & support';
  if (role === 'admin' && tab === 'notifications') return 'Notifications';
  if (role === 'admin' && tab.startsWith('professionals/')) return 'Professional';
  if (role === 'admin' && tab.startsWith('customers/')) return 'Customer';
  if (role === 'admin' && tab.startsWith('jobs/')) return 'Job';
  if (role === 'admin' && tab.startsWith('applications')) return 'Applications';
  if (role === 'customer' && tab.startsWith('find/')) return 'Professional';
  if (role === 'customer' && tab.startsWith('bookings/')) return 'Booking';
  if (role === 'customer' && tab.startsWith('garage/')) return 'Vehicle';
  return hiddenPageTitles[role]?.[tab] ?? 'Overview';
}
