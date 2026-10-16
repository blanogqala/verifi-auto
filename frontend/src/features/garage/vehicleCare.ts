export type CareState = 'upcoming' | 'due' | 'expired' | 'unknown';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dateCareState(value: unknown, today = new Date()): CareState {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'unknown';
  const expiry = new Date(`${value}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return 'unknown';
  const days = Math.round((expiry.getTime() - startOfDay(today)) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'due';
  return 'upcoming';
}

export function mileageCareState(current: unknown, next: unknown): CareState {
  const now = Number(current);
  const target = Number(next);
  if (!Number.isFinite(now) || !Number.isFinite(target) || target <= 0) return 'unknown';
  if (now >= target) return 'due';
  if (target - now <= 1000) return 'upcoming';
  return 'upcoming';
}

export function careSourceLabel(source: unknown) {
  if (source === 'mechanic') return 'Recorded by a mechanic';
  if (source === 'owner') return 'Entered by the owner';
  return 'Not recorded';
}

export function careStateLabel(state: CareState) {
  if (state === 'expired') return 'Expired';
  if (state === 'due') return 'Due';
  if (state === 'upcoming') return 'Upcoming';
  return 'Unknown';
}
