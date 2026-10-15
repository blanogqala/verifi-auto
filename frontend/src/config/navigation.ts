import { Role } from '../types/roles';
export const roles: Role[] = ['customer', 'mechanic', 'admin'];
export const roleLabel = { customer: 'Customer', mechanic: 'Mechanic', admin: 'Platform admin' };
export const navItems = {
  customer: [
    ['overview', 'Overview'],
    ['bookings', 'My bookings'],
    ['quotes', 'Quotes & approvals'],
    ['garage', 'My Garage'],
    ['payments', 'Payments'],
    ['notifications', 'Notifications'],
    ['settings', 'Account settings'],
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
