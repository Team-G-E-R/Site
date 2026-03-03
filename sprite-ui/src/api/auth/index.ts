import { AuthBackendMode, Me } from './types';
import { createMockAuthApi } from './auth.mock';
import { createHttpAuthApi } from './auth.http';

export type { Me, AuthBackendMode } from './types';

export function getBackendMode(): AuthBackendMode {
  const v = (import.meta.env.VITE_BACKEND || 'mock') as AuthBackendMode;
  return v === 'http' ? 'http' : 'mock';
}

export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE || 'http://localhost:4000') as string;
}

const mode = getBackendMode();
const httpBase = getApiBase();
const impl = mode === 'http' ? createHttpAuthApi(httpBase) : createMockAuthApi();

export async function apiRegister(email: string, password: string, name: string): Promise<Me> {
  // @ts-ignore - mock/http share method names
  return impl.register(email, password, name);
}

export async function apiLogin(email: string, password: string): Promise<Me> {
  // @ts-ignore
  return impl.login(email, password);
}

export async function apiLogout(): Promise<void> {
  // @ts-ignore
  return impl.logout();
}

export async function apiMe(): Promise<Me | null> {
  // @ts-ignore
  return impl.me();
}

export async function apiListUsers(): Promise<Me[]> {
  // only exists in mock
  // @ts-ignore
  if (typeof impl.listUsers === 'function') return impl.listUsers();
  return [];
}
