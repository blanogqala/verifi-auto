/** Calendar date for a PostgreSQL DATE. UTC parts avoid a timezone shifting the day. */
export function calendarDate(value: Date | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const exact = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
    if (exact) return exact[1];
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function dateOnly(value: string | null | undefined): Date | null {
  const day = calendarDate(value);
  return day ? new Date(`${day}T00:00:00.000Z`) : null;
}
