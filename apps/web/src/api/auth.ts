import { apiFetch } from './client';

export interface SessionDto {
  merchantId: string;
}

/** Whether the browser currently holds a valid session -- throws (ApiError, 401) if not. */
export async function fetchSession(): Promise<SessionDto> {
  const res = await apiFetch<{ data: SessionDto }>('/api/auth/session');
  return res.data;
}

export async function login(username: string, password: string): Promise<SessionDto> {
  const res = await apiFetch<{ data: SessionDto }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await apiFetch<{ data: { loggedOut: boolean } }>('/api/auth/logout', { method: 'POST' });
}
