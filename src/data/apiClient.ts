import type { AuditEntry, DentalDocument, Patient, StaffUser, UserRole } from '../types/dental';
export interface Bootstrap {
  patients: Patient[]; documents: DentalDocument[]; auditLogs: AuditEntry[]; users: Record<UserRole, StaffUser>;
}
let role: UserRole = 'dentist';
export function setDemoRole(value: UserRole) { role = value; }
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Demo-Role', role);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status}). Please retry.`);
  }
  return response.json();
}
export async function uploadOriginal(file: File): Promise<string> {
  const form = new FormData(); form.append('file', file);
  return (await request<{ id: string }>('/files', { method: 'POST', body: form })).id;
}
