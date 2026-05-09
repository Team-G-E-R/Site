import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { getApiBase, getBackendMode } from "./api";
import { apiGetJobHistory } from "./api/jobs";
import {
  jobToHistoryEntry,
  type HistoryEntry,
  type HistoryType,
} from "./history";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }

      onClose();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-[#0f131a] border border-white/10 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("login")}
            className={"chip " + (tab === "login" ? "active" : "")}
          >
            Вход
          </button>

          <button
            onClick={() => setTab("register")}
            className={"chip " + (tab === "register" ? "active" : "")}
          >
            Регистрация
          </button>
        </div>

        {tab === "register" && (
          <div className="mb-3">
            <div className="text-sm text-white/70 mb-1">Имя</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder:text-white/60 focus:border-pink-500/70"
              placeholder="Как к вам обращаться"
            />
          </div>
        )}

        <div className="mb-3">
          <div className="text-sm text-white/70 mb-1">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder:text-white/60 focus:border-pink-500/70"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-4">
          <div className="text-sm text-white/70 mb-1">Пароль</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder:text-white/60 focus:border-pink-500/70"
            placeholder="Не короче 8 символов"
          />
        </div>

        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="h-11 px-4 rounded-xl bg-pink-600/80 hover:bg-pink-500 transition disabled:opacity-60"
          >
            {loading ? "Подождите..." : "Продолжить"}
          </button>

          <button
            onClick={onClose}
            className="h-11 px-4 rounded-xl bg-white/15 hover:bg-white/25 transition text-white/90"
          >
            Отмена
          </button>
        </div>

        <div className="mt-4 text-xs text-white/50">
          Backend mode:{" "}
          <span className="text-white/80">{getBackendMode()}</span>
          {getBackendMode() === "http" && (
            <>
              {" "}
              · API: <span className="text-white/80">{getApiBase()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export type AccountTab = "history" | "settings" | "subscription";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function makeTxtFile(text: string): Blob {
  return new Blob([text], { type: "text/plain;charset=utf-8" });
}

function joinUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  if (!cleanBase) {
    return `/${cleanPath}`;
  }

  return `${cleanBase}/${cleanPath}`;
}

function resolveArtifactUrl(jobId: string, artifactPathOrUrl?: string | null): string | null {
  if (!artifactPathOrUrl) {
    return null;
  }

  if (
    artifactPathOrUrl.startsWith("http://") ||
    artifactPathOrUrl.startsWith("https://") ||
    artifactPathOrUrl.startsWith("data:") ||
    artifactPathOrUrl.startsWith("blob:")
  ) {
    return artifactPathOrUrl;
  }

  if (artifactPathOrUrl.startsWith("/api/")) {
    return joinUrl(getApiBase(), artifactPathOrUrl);
  }

  return joinUrl(
    getApiBase(),
    `/api/jobs/${jobId}/artifact/${artifactPathOrUrl}`
  );
}

async function downloadUrl(url: string, filename: string) {
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Не удалось скачать файл: ${res.status}`);
  }

  const blob = await res.blob();
  downloadBlob(blob, filename);
}

async function loadTextArtifact(
  jobId: string,
  artifactPathOrUrl?: string | null
): Promise<string> {
  const url = resolveArtifactUrl(jobId, artifactPathOrUrl);

  if (!url) {
    return "";
  }

  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Не удалось загрузить текстовый результат: ${res.status}`);
  }

  const raw = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(raw);

      if (typeof json === "string") return json;
      if (typeof json.text === "string") return json.text;
      if (typeof json.content === "string") return json.content;
      if (typeof json.result === "string") return json.result;

      return JSON.stringify(json, null, 2);
    } catch {
      return raw;
    }
  }

  return raw;
}

function generateTestWav(seconds = 2.0, freq = 440): Blob {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * seconds);
  const numChannels = 1;
  const bitsPerSample = 16;

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");

  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  const volume = 0.25;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const s = Math.sin(2 * Math.PI * freq * t) * volume;
    const v = Math.max(-1, Math.min(1, s));

    view.setInt16(44 + i * 2, Math.floor(v * 32767), true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function AccountModal({
  initialTab,
  onClose,
}: {
  initialTab: AccountTab;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AccountTab>(initialTab);

  useEffect(() => setTab(initialTab), [initialTab]);

  if (!user) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[96vw] h-[92vh] max-w-none bg-[#0f131a] border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="text-white/90 font-medium">Личный кабинет</div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="chip"
            >
              Выйти
            </button>

            <button onClick={onClose} className="chip">
              Закрыть
            </button>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab("history")}
              className={"chip " + (tab === "history" ? "active" : "")}
            >
              История генерации
            </button>

            <button
              onClick={() => setTab("settings")}
              className={"chip " + (tab === "settings" ? "active" : "")}
            >
              Настройки
            </button>

            <button
              onClick={() => setTab("subscription")}
              className={"chip " + (tab === "subscription" ? "active" : "")}
            >
              Подписка
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 min-h-0 overflow-hidden">
          {tab === "history" && (
            <div className="h-full overflow-hidden">
              <HistoryTab userId={user.id} />
            </div>
          )}

          {tab === "settings" && (
            <div className="h-full overflow-auto pr-1">
              <SettingsTab />
            </div>
          )}

          {tab === "subscription" && (
            <div className="h-full overflow-auto pr-1">
              <SubscriptionTab />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ userId }: { userId: string }) {
  const [type, setType] = useState<HistoryType>("icon");
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
  setLoading(true);
  setError(null);

  try {
    const jobs = await apiGetJobHistory(type);

    const entries: HistoryEntry[] = jobs
      .map((job) => jobToHistoryEntry(job))
      .filter((entry): entry is HistoryEntry => entry !== null);

    const enrichedEntries: HistoryEntry[] = await Promise.all(
      entries.map(async (entry) => {
        if (entry.type !== "text") {
          return entry;
        }

        if (entry.payload.text?.trim()) {
          return entry;
        }

        if (!entry.payload.artifactUrl) {
          return entry;
        }

        try {
          const text = await loadTextArtifact(entry.id, entry.payload.artifactUrl);

          return {
            ...entry,
            payload: {
              ...entry.payload,
              text,
            },
          };
        } catch {
          return entry;
        }
      })
    );

    setItems(enrichedEntries);
  } catch (e: any) {
    setError(e?.message || "Не удалось загрузить историю.");
    setItems([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    refresh();
  }, [userId, type]);

  const filtered = useMemo(
    () => items.filter((x) => x.type === type),
    [items, type]
  );

  const downloadImage = async (entry: Extract<HistoryEntry, { type: "icon" }>) => {
    const url = resolveArtifactUrl(
      entry.id,
      entry.payload.dataUrl ?? entry.payload.artifactUrl
    );

    if (!url) {
      return;
    }

    await downloadUrl(url, "image.png");
  };

  const downloadSound = async (entry: Extract<HistoryEntry, { type: "sound" }>) => {
    const url = resolveArtifactUrl(entry.id, entry.payload.artifactUrl);

    if (url) {
      await downloadUrl(url, "sound.wav");
      return;
    }

    downloadBlob(generateTestWav(entry.payload.seconds ?? 2, 440), "test.wav");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setType("icon")}
            className={"chip " + (type === "icon" ? "active" : "")}
          >
            Изображения
          </button>

          <button
            onClick={() => setType("text")}
            className={"chip " + (type === "text" ? "active" : "")}
          >
            Текст
          </button>

          <button
            onClick={() => setType("sound")}
            className={"chip " + (type === "sound" ? "active" : "")}
          >
            Аудио
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={refresh} disabled={loading} className="chip">
            {loading ? "Загрузка..." : "Обновить"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && filtered.length === 0 ? (
        <div className="text-white/60">Загружаем историю...</div>
      ) : filtered.length === 0 ? (
        <div className="text-white/60">
          Пока пусто. Сгенерируй что-нибудь — и записи появятся здесь.
        </div>
      ) : (
        <div className="space-y-3 overflow-auto pr-1 flex-1 min-h-0">
          {filtered.map((it) => {
            const imageUrl =
              it.type === "icon"
                ? resolveArtifactUrl(
                    it.id,
                    it.payload.dataUrl ?? it.payload.artifactUrl
                  )
                : null;

            const soundUrl =
              it.type === "sound"
                ? resolveArtifactUrl(it.id, it.payload.artifactUrl)
                : null;

            return (
              <div
                key={it.id}
                className="bg-[#0b0e13] border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white/80 text-sm">
                      {it.createdAt
                        ? new Date(it.createdAt).toLocaleString()
                        : "Дата неизвестна"}
                    </div>

                    <div className="text-white/70 text-sm mt-1 break-words">
                      <span className="text-white/50">Prompt:</span>{" "}
                      {it.prompt || (
                        <span className="text-white/50">(empty)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {it.type === "icon" && (
                      <button
                        onClick={() => downloadImage(it)}
                        disabled={!imageUrl}
                        className="chip"
                      >
                        Скачать PNG
                      </button>
                    )}

                    {it.type === "text" && (
                      <button
                        onClick={async () => {
                          if (it.payload.artifactUrl) {
                            const url = resolveArtifactUrl(it.id, it.payload.artifactUrl);
                          
                            if (url) {
                              await downloadUrl(url, "result.txt");
                              return;
                            }
                          }
                        
                          downloadBlob(makeTxtFile(it.payload.text), "result.txt");
                        }}
                        className="chip"
                      >
                        Скачать TXT
                      </button>
                    )}

                    {it.type === "sound" && (
                      <button onClick={() => downloadSound(it)} className="chip">
                        Скачать WAV
                      </button>
                    )}
                  </div>
                </div>

                {it.type === "icon" && (
                  <div className="mt-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        className="w-40 h-40 rounded-xl border border-white/10 bg-black/30 object-contain"
                      />
                    ) : (
                      <div className="text-white/50 text-sm">
                        Изображение недоступно.
                      </div>
                    )}
                  </div>
                )}

                {it.type === "text" && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 whitespace-pre-wrap break-words max-h-40 overflow-auto">
                    {it.payload.text || "Текстовый результат пуст."}
                  </div>
                )}

                {it.type === "sound" && (
                  <div className="mt-3">
                    {soundUrl ? (
                      <audio controls src={soundUrl} className="w-full max-w-xl" />
                    ) : (
                      <div className="text-white/70 text-sm">
                        Длина:{" "}
                        <span className="text-white/90">
                          {it.payload.seconds ?? 2}s
                        </span>{" "}
                        · тестовый WAV
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!oldPass || !newPass || !newPass2) {
      setMsg("Заполни все поля.");
      return;
    }

    if (newPass.length < 8) {
      setMsg("Новый пароль минимум 8 символов.");
      return;
    }

    if (newPass !== newPass2) {
      setMsg("Пароли не совпадают.");
      return;
    }

    setOldPass("");
    setNewPass("");
    setNewPass2("");
    setMsg("Пароль изменён (заглушка).");
  };

  return (
    <div className="max-w-xl">
      <div className="text-white/80 font-medium mb-3">Смена пароля</div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="text-sm text-white/70 mb-1">Текущий пароль</div>
          <input
            type="password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white focus:border-pink-500/70"
          />
        </div>

        <div>
          <div className="text-sm text-white/70 mb-1">Новый пароль</div>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white focus:border-pink-500/70"
          />
        </div>

        <div>
          <div className="text-sm text-white/70 mb-1">Повтори новый пароль</div>
          <input
            type="password"
            value={newPass2}
            onChange={(e) => setNewPass2(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white focus:border-pink-500/70"
          />
        </div>

        {msg && <div className="text-sm text-white/70">{msg}</div>}

        <button className="h-11 px-4 rounded-xl bg-pink-600/80 hover:bg-pink-500 transition text-white">
          Сохранить
        </button>
      </form>

      <div className="text-xs text-white/50 mt-4">
        Пока это заглушка — реальная смена пароля будет работать через бэкенд.
      </div>
    </div>
  );
}

function SubscriptionTab() {
  const tiers = [
    {
      title: "Starter",
      desc: "Тестовый текст: базовая подписка для знакомства.",
    },
    {
      title: "Pro",
      desc: "Тестовый текст: больше лимитов и быстрее генерация.",
    },
    {
      title: "Team",
      desc: "Тестовый текст: для команды, совместный доступ.",
    },
  ];

  return (
    <div className="space-y-3">
      {tiers.map((t) => (
        <div
          key={t.title}
          className="bg-[#0b0e13] border border-white/10 rounded-2xl p-5"
        >
          <div className="text-white/90 font-medium text-lg">{t.title}</div>
          <div className="text-white/70 mt-2">{t.desc}</div>

          <div className="mt-4">
            <button className="w-full h-11 rounded-xl bg-pink-600/80 hover:bg-pink-500 transition text-white">
              Купить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}