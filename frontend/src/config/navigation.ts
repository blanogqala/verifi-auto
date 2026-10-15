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
    ['appointments/pending', 'Appointments'],
    ['jobs', 'Jobs'],
    ['payments', 'Payments'],
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
  admin: navItems.admin.map(([id]) => id),
};

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
};

export function pageTitle(role: Role, tab: string) {
  const visible = navItems[role].find(([id]) => id === tab);
  if (visible) return visible[1];
  if (role === 'mechanic' && (tab.startsWith('profile/') || tab === 'profile')) return 'Profile';
  if (role === 'mechanic' && tab.startsWith('appointments')) return 'Appointments';
  return hiddenPageTitles[role]?.[tab] ?? 'Overview';
}
