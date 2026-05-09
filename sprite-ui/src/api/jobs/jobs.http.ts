import type { HistoryType } from "../../history";
import type { JobCreateRequest, JobResponse } from "./types";

function asTextError(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function createHttpJobsApi(apiBase: string) {
  const base = apiBase.replace(/\/$/, "");

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;

    try {
      res = await fetch(`${base}${path}`, {
        credentials: "include",
        ...(init || {}),
      });
    } catch (e) {
      throw new Error(
        `Не удалось подключиться к серверу (${base}). ${asTextError(e)}`
      );
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  async function callBlob(path: string, init?: RequestInit): Promise<Blob> {
    let res: Response;

    try {
      res = await fetch(`${base}${path}`, {
        credentials: "include",
        ...(init || {}),
      });
    } catch (e) {
      throw new Error(
        `Не удалось подключиться к серверу (${base}). ${asTextError(e)}`
      );
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status}`);
    }

    return await res.blob();
  }

  function normalizeArtifactPath(path: string): string {
    return path.replace(/^\/+/, "");
  }

  function buildQuery(params: Record<string, string | number | undefined>) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        search.set(key, String(value));
      }
    }

    const query = search.toString();
    return query ? `?${query}` : "";
  }

  return {
    create(body: JobCreateRequest) {
      return call<JobResponse>("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    get(jobId: string) {
      return call<JobResponse>(`/api/jobs/${jobId}`);
    },

    history(type?: HistoryType, limit = 50, offset = 0) {
      const query = buildQuery({
        type,
        limit,
        offset,
      });

      return call<JobResponse[]>(`/api/jobs/history${query}`);
    },

    artifact(jobId: string, artifactPath: string) {
      const cleanPath = normalizeArtifactPath(artifactPath);
      return callBlob(`/api/jobs/${jobId}/artifact/${cleanPath}`);
    },
  };
}