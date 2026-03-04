import { Me } from './types';

function asTextError(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createHttpAuthApi(apiBase: string) {
  const base = apiBase.replace(/\/$/, '');
  console.log("Create IMPL in HTTP mode apiBase:" + apiBase);
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      console.log('[AUTH][REQ]', `${base}${path}`, init?.method ?? 'GET');
      res = await fetch(`${base}${path}`, {
        credentials: 'include',
        ...(init || {}),
      });
    } catch (e) {
      throw new Error(`Не удалось подключиться к серверу (${base}). ${asTextError(e)}`);
    }

    if (res.status === 204) return undefined as unknown as T;
    if (res.status === 401 && path === '/api/auth/me') return null as unknown as T;

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }
    console.log('[AUTH][RES]', `${base}${path}`, res.status);
    return (await res.json()) as T;
  }

  return {
  register(email: string, password: string, name: string): Promise<Me> {
    return call<Me>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
  },
  login(email: string, password: string): Promise<Me> {
    return call<Me>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },
  logout(): Promise<void> {
    return call<void>('/api/auth/logout', { method: 'POST' });
  },
  me(): Promise<Me | null> {
    return call<Me | null>('/api/auth/me');
  },
};
}
