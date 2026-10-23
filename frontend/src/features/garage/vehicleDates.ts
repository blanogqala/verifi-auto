/** Date-only value for a vehicle reminder. This is not an appointment timestamp. */
export function calendarDateInput(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const exact = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
    if (exact) return exact[1];
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function calendarDateOrNull(value: unknown): string | null {
  return calendarDateInput(value) || null;
}
