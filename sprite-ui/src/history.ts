export type HistoryKind = "image" | "text" | "audio";

export type HistoryEntry =
  | {
      id: string;
      userId: string;
      kind: "image";
      createdAt: string;
      prompt: string;
      payload: {
        dataUrl: string;
        width: number;
        height: number;
      };
    }
  | {
      id: string;
      userId: string;
      kind: "text";
      createdAt: string;
      prompt: string;
      payload: {
        text: string;
        wordCount: number;
      };
    }
  | {
      id: string;
      userId: string;
      kind: "audio";
      createdAt: string;
      prompt: string;
      payload: {
        seconds: number;
      };
    };

const LS_KEY = "spritegen_history_v1";

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

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">) {
  const items = readAll();
  const full: HistoryEntry = {
    ...(entry as any),
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  items.unshift(full);
  writeAll(items.slice(0, 200)); // keep last 200
}

export function getHistoryForUser(userId: string): HistoryEntry[] {
  const items = readAll();
  return items
    .filter((x) => x.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function clearHistoryForUser(userId: string) {
  const items = readAll().filter((x) => x.userId !== userId);
  writeAll(items);
}

export function removeHistoryEntry(id: string) {
  const items = readAll().filter((x) => x.id !== id);
  writeAll(items);
}
