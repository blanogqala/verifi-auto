import { Role } from '../types/roles';
import { navItems } from '../config/navigation';
export function canVisit(role: Role | null, page: string) {
  if (!page.startsWith('dashboard/')) return true;
  if (!role) return false;
  return navItems[role].some(([id]) => page === 'dashboard/' + id);
}
