import type {
  AuditEntry,
  DentalDocument,
  Patient,
  StaffUser,
  UserRole,
} from '../types/dental';
export interface Bootstrap {
  patients: Patient[];
  documents: DentalDocument[];
  auditLogs: AuditEntry[];
  currentUser: StaffUser;
  reviewPendingCount: number;
}
export interface AuthState {
  user: StaffUser;
  csrfToken: string;
  privacyAcknowledged: boolean;
  noticeVersion: string;
}
let csrfToken = '';
let credentialEpoch = 0;
export function clearCredentials() {
  csrfToken = '';
  credentialEpoch += 1;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const epoch = credentialEpoch;
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'DentDocs');
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  if (init.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (
      response.status === 401 &&
      path !== '/auth/login' &&
      epoch === credentialEpoch
    )
      window.dispatchEvent(new Event('dentdocs:unauthorized'));
    throw new ApiError(
      typeof body.detail === 'string'
        ? body.detail
        : `Request failed (${response.status}). Please retry.`,
      response.status,
    );
  }
  const result = await response.json();
  if (typeof result.csrfToken === 'string' && epoch === credentialEpoch)
    csrfToken = result.csrfToken;
  return result;
}
export async function uploadOriginal(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  return (
    await request<{ id: string }>('/files', { method: 'POST', body: form })
  ).id;
}
