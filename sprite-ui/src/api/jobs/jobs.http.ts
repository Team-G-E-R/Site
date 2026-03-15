import { JobCreateRequest, JobResponse } from './types';

function asTextError(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createHttpJobsApi(apiBase: string) {
  const base = apiBase.replace(/\/$/, '');

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        credentials: 'include',
        ...(init || {}),
      });
    } catch (e) {
      throw new Error(`Не удалось подключиться к серверу (${base}). ${asTextError(e)}`);
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  return {
    create(body: JobCreateRequest) {
  return call<JobResponse>('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    });
    },
    get(jobId: string) {
        return call<JobResponse>(`/api/jobs/${jobId}`);
    },
  };
}