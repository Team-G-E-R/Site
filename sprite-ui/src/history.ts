import type { JobResponse, JobType } from "./api/jobs/types";

export type HistoryType = Exclude<JobType, "sprites">;

export type HistoryEntry =
  | {
      id: string;
      userId: string;
      type: "icon";
      createdAt: string;
      prompt: string;
      payload: {
        dataUrl?: string;
        artifactUrl?: string;
        width?: number;
        height?: number;
      };
    }
  | {
      id: string;
      userId: string;
      type: "text";
      createdAt: string;
      prompt: string;
      payload: {
        text: string;
        artifactUrl?: string;
        wordCount?: number;
      };
    }
  | {
      id: string;
      userId: string;
      type: "sound";
      createdAt: string;
      prompt: string;
      payload: {
        artifactUrl?: string;
        seconds?: number;
      };
    };

const LS_KEY = "frameweaver_history_v1";

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: HistoryEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function getPromptFromParams(params: Record<string, any> | null | undefined): string {
  if (!params) return "";
  return params.prompt_original ?? params.prompt ?? "";
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">) {
  const items = readAll();

  const full: HistoryEntry = {
    ...(entry as HistoryEntry),
    id: uid(),
    createdAt: new Date().toISOString(),
  };

  items.unshift(full);
  writeAll(items.slice(0, 200));
}

export function getHistoryForUser(userId: string): HistoryEntry[] {
  return readAll()
    .filter((x) => x.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getHistoryForUserByType(userId: string, type: HistoryType): HistoryEntry[] {
  return getHistoryForUser(userId).filter((x) => x.type === type);
}

export function clearHistoryForUser(userId: string) {
  writeAll(readAll().filter((x) => x.userId !== userId));
}

export function removeHistoryEntry(id: string) {
  writeAll(readAll().filter((x) => x.id !== id));
}

/**
 * Временный адаптер:
 * когда будем получать историю с backend, сможем переводить JobResponse в HistoryEntry.
 */
export function jobToHistoryEntry(job: JobResponse): HistoryEntry | null {
  if (job.type === "sprites") {
    return null;
  }

  const result = job.result ?? {};
  const artifacts = result.artifacts ?? {};
  const meta = result.meta ?? {};

  const base = {
    id: String(job.job_id),
    userId: String(job.user_id),
    type: job.type,
    createdAt: job.created_at,
    prompt: getPromptFromParams(job.params),
  };

  if (job.type === "icon") {
    return {
      ...base,
      type: "icon",
      payload: {
        artifactUrl:
          artifacts.image ??
          artifacts.icon ??
          artifacts.preview ??
          artifacts.result ??
          undefined,
        width: meta.width,
        height: meta.height,
      },
    };
  }

  if (job.type === "text") {
  return {
    ...base,
    type: "text",
    payload: {
      text:
        result.text ??
        result.content ??
        meta.text ??
        meta.content ??
        "",
      artifactUrl:
        artifacts.text ??
        artifacts.result ??
        artifacts.preview ??
        undefined,
      wordCount:
        meta.word_count ??
        meta.wordCount,
    },
  };
}

  if (job.type === "sound") {
    return {
      ...base,
      type: "sound",
      payload: {
        artifactUrl:
          artifacts.audio ??
          artifacts.sound ??
          artifacts.wav ??
          artifacts.result ??
          undefined,
        seconds:
          meta.duration_seconds ??
          meta.durationSeconds ??
          meta.seconds,
      },
    };
  }

  return null;
}