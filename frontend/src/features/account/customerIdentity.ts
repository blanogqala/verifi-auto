export function customerFullName(name: unknown) {
  return typeof name === 'string' ? name.trim() : '';
}

export function initialsFromName(name: unknown) {
  const full = customerFullName(name);
  if (!full) return '?';
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function customerInitials(name: unknown) {
  return initialsFromName(name);
}

export function customerIdentityLabel(name: unknown) {
  return customerFullName(name) || 'Customer';
}

export function merchantIdentityLabel(name: unknown) {
  return customerFullName(name) || 'Mechanic';
}

export function adminIdentityLabel(name: unknown) {
  return customerFullName(name) || 'Admin';
}
