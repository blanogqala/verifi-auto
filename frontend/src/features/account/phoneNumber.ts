/** Reasonable South African local and +27 checks. This is not a carrier lookup. */
export function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/[\s()-]/g, '') : '';
}

export function phoneError(value: unknown) {
  const phone = normalizePhone(value);
  if (!phone) return 'Enter a cell phone number.';
  if (/^\+27[1-8]\d{8}$/.test(phone) || /^0[1-8]\d{8}$/.test(phone)) return '';
  return 'Enter a South African number, such as 082 123 4567 or +27 82 123 4567.';
}

export function formatPhone(value: unknown) {
  const phone = normalizePhone(value);
  if (/^0\d{9}$/.test(phone)) return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  if (/^\+27\d{9}$/.test(phone))
    return `+27 ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
  return typeof value === 'string' ? value.trim() : '';
}
