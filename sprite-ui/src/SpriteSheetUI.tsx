import React, { useMemo, useRef, useState, useEffect } from "react";
import { apiCreateJob, apiGetJob, apiGetJobArtifactBlob } from "./api/jobs";

type Category = "Character" | "Building" | "Creature" | "Prop";
type GenMode = "image" | "text" | "audio";

function modeLabel(m: GenMode) {
  if (m === "text") return "Text";
  if (m === "audio") return "Music";
  return "Image";
}

function modeTitle(m: GenMode) {
  if (m === "text") return "Generate a text about...";
  if (m === "audio") return "Generate game music about...";
  return "Generate an image about...";
}

function modePlaceholder(m: GenMode) {
  if (m === "text")
    return "Например: короткое описание персонажа, лор, квест, диалоги...";
  if (m === "audio")
    return "Например: battle theme, ambient dungeon loop, main menu theme, calm village music...";
  return "Например: knight, 16-bit, clean outlines";
}

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

export default function SpriteSheetUI() {
  const [mode, setMode] = useState<GenMode>("image");
  const [modeOpen, setModeOpen] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [category, setCategory] = useState<Category>("Character");
  const [style, setStyle] = useState("Pixel Art");
  const [canvasSize, setCanvasSize] = useState("128x128");

  // Image mode
  const [isLoop, setIsLoop] = useState(true);
  const [removeBg, setRemoveBg] = useState(false);

  // Text mode
  const [wordCount, setWordCount] = useState(80);
  const [textOut, setTextOut] = useState<string>(
    "Нажми GENERATE, чтобы получить тестовый результат текста.",
  );

  // Audio mode
  const [audioSeconds, setAudioSeconds] = useState(5);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const size = useMemo(() => {
    const [w, h] = canvasSize.split("x").map(Number);
    return { w, h };
  }, [canvasSize]);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  async function waitJob(jobId: string) {
    for (let i = 0; i < 2400; i++) {
      const job = await apiGetJob(jobId);
      if (job.status === "failed")
        throw new Error(job.error ?? "Generation failed");
      if (job.status === "succeeded") return job;
      await sleep(700);
    }

    throw new Error("Timeout waiting for job");
  }

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultImgRef = useRef<HTMLImageElement | null>(null);

  const drawImagePlaceholder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => {
    const px = category === "Building" ? 10 : category === "Prop" ? 7 : 8;
    const palette =
      category === "Character"
        ? ["#f472b6", "#fb7185", "#a78bfa", "#38bdf8", "#22c55e"]
        : category === "Building"
          ? ["#a3a3a3", "#737373", "#c084fc", "#f59e0b", "#60a5fa"]
          : category === "Creature"
            ? ["#22c55e", "#86efac", "#34d399", "#10b981", "#14b8a6"]
            : ["#f59e0b", "#f97316", "#fb7185", "#38bdf8", "#a3a3a3"];

    for (let y = 0; y < h; y += px) {
      for (let x = 0; x < w; x += px) {
        const k = ((x + y) / px) % palette.length;
        ctx.fillStyle = palette[Math.floor(k)];
        if (removeBg && (x < px || y < px || x > w - px * 2 || y > h - px * 2))
          continue;
        ctx.fillRect(x, y, px - 1, px - 1);
      }
    }
  };

  const redrawPreview = () => {
    if (mode !== "image") return;

    const el = previewCanvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const { w, h } = size;
    el.width = w;
    el.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    if (!removeBg) {
      ctx.fillStyle = "#0b0e13";
      ctx.fillRect(0, 0, w, h);
    }

    const img = resultImgRef.current;
    if (img) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      drawImagePlaceholder(ctx, w, h);
    }

    ctx.strokeStyle = "#2e2e2e";
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  };

  useEffect(() => {
    redrawPreview();
  }, [mode, size, removeBg, category, resultUrl]);

  useEffect(() => {
    resultImgRef.current = null;

    if (!resultUrl) {
      redrawPreview();
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      resultImgRef.current = img;
      redrawPreview();
    };
    img.src = resultUrl;

    return () => {
      cancelled = true;
    };
  }, [resultUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [resultUrl, audioUrl]);

  const onGenerate = async () => {
    if (mode === "text") {
      const cleanPrompt = prompt.trim();

      if (!cleanPrompt) {
        setGenError("Введите prompt для генерации текста.");
        return;
      }

      setGenError(null);
      setIsGenerating(true);
      setTextOut("Генерация текста...");

      try {
        const created = await apiCreateJob({
          type: "text",
          params: {
            prompt: cleanPrompt,
            text_kind: "other",
            language: "ru",
            word_count: wordCount,
          },
        });

        const jobId = String(created.job_id);
        const done = await waitJob(jobId);
        const textRel =
          done.result?.artifacts?.text ??
          done.result?.artifacts?.result ??
          "out/result.txt";

        const blob = await apiGetJobArtifactBlob(jobId, textRel);
        const generatedText = await blob.text();

        setTextOut(generatedText);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setGenError(message);
        setTextOut(`Ошибка генерации текста:\n${message}`);
      } finally {
        setIsGenerating(false);
      }

      return;
    }

    if (mode === "audio") {
      const cleanPrompt = prompt.trim();

      if (!cleanPrompt) {
        setGenError("Введите prompt для генерации музыки.");
        return;
      }

      setGenError(null);
      setIsGenerating(true);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      try {
        const created = await apiCreateJob({
          type: "sound",
          params: {
            prompt: cleanPrompt,
            audio_kind: "music",
            duration_seconds: audioSeconds,
            sample_rate: 44100,
          },
        });

        const jobId = String(created.job_id);
        const done = await waitJob(jobId);
        const audioRel =
          done.result?.artifacts?.audio ??
          done.result?.artifacts?.wav ??
          done.result?.artifacts?.result ??
          "out/result.wav";

        const blob = await apiGetJobArtifactBlob(jobId, audioRel);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        setTimeout(() => {
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.loop = isLoop;
            audio.play().catch(() => {});
          }
        }, 0);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setGenError(message);
      } finally {
        setIsGenerating(false);
      }

      return;
    }

    setGenError(null);
    setIsGenerating(true);

    setResultUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    resultImgRef.current = null;

    try {
      const created = await apiCreateJob({
        type: "icon",
        params: { prompt, size: size.w },
      });

      const jobId = String(created.job_id);
      const done = await waitJob(jobId);
      const imageRel = done.result?.artifacts?.image;

      if (!imageRel) throw new Error("No image artifact");

      const blob = await apiGetJobArtifactBlob(jobId, imageRel);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    const el = previewCanvasRef.current;
    if (!el) return;

    el.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, "image.png");
    });
  };

  useEffect(() => {
    if (!modeOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-mode-menu]")) return;
      setModeOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [modeOpen]);

  const switchMode = (m: GenMode) => {
    setMode(m);
    setModeOpen(false);

    setGenError(null);

    if (m !== "audio" && audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const downloadText = () => downloadBlob(makeTxtFile(textOut), "result.txt");

  const audioPlayPause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const audioRestart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const audioDownload = async () => {
    if (!audioUrl) return;
    const res = await fetch(audioUrl);
    const blob = await res.blob();
    downloadBlob(blob, "result.wav");
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = isLoop;
  }, [isLoop, audioUrl]);

  return (
    <div className="min-h-screen w-full bg-[#0b0e13] text-white flex items-stretch justify-center p-4 md:p-8">
      <div className="w-full max-w-none grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT */}
        <div className="bg-[#0f131a] rounded-2xl p-6 border border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-pink-300">
              <SparklesIcon />
              <span className="tracking-wide">{modeTitle(mode)}</span>
            </div>

            <div className="relative" data-mode-menu>
              <button
                className="chip"
                onClick={() => setModeOpen((v) => !v)}
                type="button"
                aria-haspopup="menu"
                aria-expanded={modeOpen}
              >
                Mode: {modeLabel(mode)} ▾
              </button>

              {modeOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0b0e13] shadow-[0_10px_30px_rgba(0,0,0,0.6)] overflow-hidden">
                  <button
                    className={
                      "w-full text-left px-3 py-2 hover:bg-white/10 " +
                      (mode === "image" ? "text-pink-300" : "text-white/85")
                    }
                    onClick={() => switchMode("image")}
                    type="button"
                  >
                    Image
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Pixel image / sprites preview
                    </div>
                  </button>
                  <button
                    className={
                      "w-full text-left px-3 py-2 hover:bg-white/10 " +
                      (mode === "text" ? "text-pink-300" : "text-white/85")
                    }
                    onClick={() => switchMode("text")}
                    type="button"
                  >
                    Text
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Generate text + download TXT
                    </div>
                  </button>
                  <button
                    className={
                      "w-full text-left px-3 py-2 hover:bg-white/10 " +
                      (mode === "audio" ? "text-pink-300" : "text-white/85")
                    }
                    onClick={() => switchMode("audio")}
                    type="button"
                  >
                    Audio
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Generate game music + download WAV
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={modePlaceholder(mode)}
            className="w-full h-28 rounded-xl bg-[#0b0e13] border border-white/10 p-4 outline-none focus:border-pink-500/70 placeholder:text-white/40"
          />

          {/* Reference image only for Image mode (как на скрине) */}
          {mode === "image" && (
            <div className="mt-4">
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/20 rounded-xl py-8 cursor-pointer bg-[#0b0e13] hover:border-pink-400/40 transition">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.item(0) ?? null)}
                />
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <UploadIcon />
                </div>
                <div className="text-white/80 text-sm">
                  Click to upload a reference image
                </div>
                <div className="text-white/40 text-xs">PNG, JPG up to 10MB</div>
                {file && (
                  <div className="text-xs text-white/60 mt-1">{file.name}</div>
                )}
              </label>
            </div>
          )}

          {/* Bottom controls depend on mode */}
          {mode === "image" && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-[#0b0e13] border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500/70 outline-none"
                >
                  {["Character", "Building", "Creature", "Prop"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Style">
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-[#0b0e13] border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500/70 outline-none"
                >
                  {["Pixel Art", "Game Boy", "PICO-8", "SNES"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Canvas Size">
                <select
                  value={canvasSize}
                  onChange={(e) => setCanvasSize(e.target.value)}
                  className="w-full bg-[#0b0e13] border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500/70 outline-none"
                >
                  {["64x64", "96x96", "128x128", "256x256"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {mode === "text" && (
            <div className="mt-5">
              <Field label="Words count">
                <select
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full bg-[#0b0e13] border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500/70 outline-none"
                >
                  {[30, 50, 80, 120, 200, 300].map((n) => (
                    <option key={n} value={n}>
                      {n} words
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {mode === "audio" && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-white/70 text-sm mb-1">
                <span>Track length</span>
                <span>{audioSeconds}s</span>
              </div>
              <input
                type="range"
                min={5}
                max={160}
                step={5}
                value={audioSeconds}
                onChange={(e) => setAudioSeconds(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>
          )}

          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="mt-6 w-full h-11 rounded-xl bg-pink-600/80 hover:bg-pink-500 disabled:opacity-50 transition text-white font-medium tracking-wide"
          >
            {isGenerating ? "GENERATING..." : "GENERATE"}
          </button>

          {genError && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {genError}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="bg-[#0f131a] rounded-2xl p-6 border border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_30px_rgba(0,0,0,0.6)] flex flex-col">
          {mode === "image" && (
            <>
              <div className="flex items-center gap-2 mb-3 text-white/80">
                <button
                  onClick={() => setRemoveBg((v) => !v)}
                  className={"chip " + (removeBg ? "active" : "")}
                >
                  Remove Background
                </button>
                <button onClick={downloadImage} className="chip">
                  Download PNG
                </button>
              </div>

              <div
                className={
                  "rounded-2xl border border-white/10 w-full aspect-square overflow-hidden flex items-center justify-center " +
                  (removeBg ? "checker" : "bg-[#0b0e13]")
                }
              >
                <canvas ref={previewCanvasRef} />
              </div>

              {genError && (
                <div className="mt-3 text-sm text-red-300">{genError}</div>
              )}
            </>
          )}

          {mode === "text" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/85 font-medium">Generated Text</div>
                <button onClick={downloadText} className="chip">
                  Download TXT
                </button>
              </div>

              <div className="flex-1 rounded-2xl bg-[#0b0e13] border border-white/10 p-4 overflow-auto whitespace-pre-wrap text-white/85">
                {textOut}
              </div>
            </>
          )}

          {mode === "audio" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/85 font-medium">Generated Music</div>
                <div className="flex items-center gap-2">
                  <button onClick={audioPlayPause} className="chip">
                    {audioRef.current && !audioRef.current.paused
                      ? "Pause"
                      : "Play"}
                  </button>
                  <button
                    onClick={() => setIsLoop((v) => !v)}
                    className={"chip " + (isLoop ? "active" : "")}
                  >
                    Loop
                  </button>
                  <button onClick={audioRestart} className="chip">
                    Restart
                  </button>
                  <button onClick={audioDownload} className="chip">
                    Download WAV
                  </button>
                </div>
              </div>

              <div className="flex-1 rounded-2xl bg-[#0b0e13] border border-white/10 p-4 flex items-center justify-center">
                {!audioUrl ? (
                  <div className="text-white/60">
                    Нажми GENERATE, чтобы сгенерировать музыкальный трек через backend job.
                  </div>
                ) : (
                  <div className="w-full">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      className="w-full"
                    />
                    <div className="text-xs text-white/50 mt-2">
                      Generated music WAV: {audioSeconds}s
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-white/70 text-sm">{label}</div>
      {children}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="#f472b6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 16V4m0 0l-4 4m4-4l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 20h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
