export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let csrf = '';
export function setCsrf(value: string) {
  csrf = value;
}
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const upload = body instanceof FormData;
  const response = await fetch(`${apiBase}/api${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: {
      ...(!upload && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    body: body === undefined ? undefined : upload ? body : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const fields = result?.error?.fields?.map((f: any) => `${f.path}: ${f.message}`).join(' ');
    throw new ApiFailure(
      response.status,
      result?.error?.code || 'REQUEST_FAILED',
      fields || result?.error?.message || 'Could not complete the request. Please try again.',
    );
  }
  return result as T;
}
export type LiveUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'MECHANIC' | 'ADMIN';
  verifiedAt: string | null;
};
export const displayStatus = (value: string) => value.toLowerCase().replaceAll('_', ' ');
export const money = (cents: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);
