import { Role } from '../../types/roles';

/** Save sign-in details onto the role that owns them. */
export function applyAccountDetails(data: any, role: Role, details: any = {}) {
  const name = typeof details?.name === 'string' ? details.name.trim() : '';
  const email = typeof details?.email === 'string' ? details.email.trim() : '';
  if (!name && !email) return data;
  if (role === 'customer') {
    return {
      ...data,
      settings: {
        ...data.settings,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
    };
  }
  if (role === 'mechanic') {
    return {
      ...data,
      mechanicAccount: {
        ...(data.mechanicAccount || data.merchantAccount || {}),
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
    };
  }
  return data;
}
