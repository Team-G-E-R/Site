import React, { useMemo, useRef, useState, useEffect } from "react";

type Category = "Character" | "Building" | "Creature" | "Prop";

export default function SpriteSheetUI() {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [category, setCategory] = useState<Category>("Character");
  const [frameCount, setFrameCount] = useState(9);
  const [style, setStyle] = useState("Pixel Art");
  const [canvasSize, setCanvasSize] = useState("128x128");

  const [fps, setFps] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoop, setIsLoop] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [removeBg, setRemoveBg] = useState(false);

  const size = useMemo(() => {
    const [w, h] = canvasSize.split("x").map(Number);
    return { w, h };
  }, [canvasSize]);

  const frames = useMemo(() => Array.from({ length: frameCount }, (_, i) => i), [frameCount]);
  const animTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    if (animTimer.current) cancelAnimationFrame(animTimer.current);
    let acc = 0;
    let last = performance.now();
    const frameDur = 1000 / fps;
    const tick = (t: number) => {
      acc += t - last;
      last = t;
      while (acc >= frameDur) {
        setCurrentFrame((f) => {
          const nf = f + 1;
          if (nf >= frameCount) return isLoop ? 0 : (setIsPlaying(false), frameCount - 1);
          return nf;
        });
        acc -= frameDur;
      }
      if (isPlaying) animTimer.current = requestAnimationFrame(tick);
    };
    animTimer.current = requestAnimationFrame(tick);
    return () => {
      if (animTimer.current) cancelAnimationFrame(animTimer.current);
      animTimer.current = null;
    };
  }, [isPlaying, fps, frameCount, isLoop]);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
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

    // simple "placeholder art" (different by category)
    const px = category === "Building" ? 10 : category === "Prop" ? 7 : 8;
    const palette =
      category === "Character" ? ["#f472b6", "#fb7185", "#a78bfa", "#38bdf8", "#22c55e"]
      : category === "Building" ? ["#a3a3a3", "#737373", "#c084fc", "#f59e0b", "#60a5fa"]
      : category === "Creature" ? ["#22c55e", "#86efac", "#34d399", "#10b981", "#14b8a6"]
      : ["#f59e0b", "#f97316", "#fb7185", "#38bdf8", "#a3a3a3"];

    for (let y = 0; y < h; y += px) {
      for (let x = 0; x < w; x += px) {
        const k = ((x + y + currentFrame * 5) / px) % palette.length;
        // @ts-ignore
        ctx.fillStyle = palette[Math.floor(k)];
        if (removeBg && (x < px || y < px || x > w - px * 2 || y > h - px * 2)) continue;
        ctx.fillRect(x + (currentFrame % 3), y + ((currentFrame * 2) % 3), px - 1, px - 1);
      }
    }

    ctx.strokeStyle = "#2e2e2e";
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [size, currentFrame, removeBg, category]);

  const makeSpriteSheet = () => {
    const { w, h } = size;
    const cols = Math.min(frameCount, 6);
    const rows = Math.ceil(frameCount / cols);
    const sheet = document.createElement("canvas");
    sheet.width = cols * w;
    sheet.height = rows * h;
    const sctx = sheet.getContext("2d");
    if (!sctx) return null;
    sctx.imageSmoothingEnabled = false;
    const tmp = previewCanvasRef.current;
    if (!tmp) return null;
    for (let i = 0; i < frameCount; i++) {
      setCurrentFrame(i);
      const r = Math.floor(i / cols);
      const c = i % cols;
      const ctx = tmp.getContext("2d");
      if (ctx) sctx.drawImage(tmp, c * w, r * h);
    }
    return sheet;
  };

  const downloadSpriteSheet = () => {
    const sheet = makeSpriteSheet();
    if (!sheet) return;
    sheet.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprite-sheet.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const copyCss = async () => {
    const steps = frameCount;
    const css = `@keyframes sprite-run {\n  from { background-position: 0 0; }\n  to { background-position: -${steps - 1}00% 0; }\n}\n.sprite {\n  width: ${size.w}px;\n  height: ${size.h}px;\n  background-image: url(sprite-sheet.png);\n  background-size: ${steps}00% 100%;\n  animation: sprite-run ${((steps / fps)).toFixed(2)}s steps(${steps}) infinite;\n}`;
    try {
      await navigator.clipboard.writeText(css);
      alert("CSS скопирован в буфер обмена");
    } catch {}
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0e13] text-white flex items-stretch justify-center p-4 md:p-8">
      <div className="w-full max-w-none grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0f131a] rounded-2xl p-6 border border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-pink-300 mb-3">
            <SparklesIcon />
            <span className="tracking-wide">Generate a pixel animation about...</span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: knight run cycle, 16-bit, clean outlines"
            className="w-full h-28 rounded-xl bg-[#0b0e13] border border-white/10 p-4 outline-none focus:border-pink-500/70 placeholder:text-white/40"
          />

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
              <div className="text-white/80 text-sm">Click to upload a reference image</div>
              <div className="text-white/40 text-xs">PNG, JPG up to 10MB</div>
              {file && <div className="text-xs text-white/60 mt-1">{file.name}</div>}
            </label>
          </div>

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

            <Field label="Frame Count">
              <select
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value))}
                className="w-full bg-[#0b0e13] border border-white/10 rounded-lg px-3 py-2 focus:border-pink-500/70 outline-none"
              >
                {[6, 8, 9, 12, 16, 24, 32].map((n) => (
                  <option key={n} value={n}>
                    {n} frames
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

          <button
            onClick={() => setIsPlaying(true)}
            className="mt-6 w-full h-11 rounded-xl bg-pink-600/80 hover:bg-pink-500 transition text-white font-medium tracking-wide"
          >
            GENERATE
          </button>

          <div className="text-white/40 text-xs mt-3">MVP: UI only (no AI yet)</div>
        </div>

        <div className="bg-[#0f131a] rounded-2xl p-6 border border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_30px_rgba(0,0,0,0.6)] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white/80">
              <button onClick={() => setIsPlaying((p) => !p)} className="chip">
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button onClick={() => setIsLoop((v) => !v)} className={"chip " + (isLoop ? "active" : "")}>
                Loop
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentFrame(0);
                }}
                className="chip"
              >
                Reset
              </button>
              <button onClick={() => setRemoveBg((v) => !v)} className={"chip " + (removeBg ? "active" : "")}>
                Remove Background
              </button>
            </div>
            <div className="text-xs text-white/50">
              Frame {currentFrame + 1} of {frameCount}
            </div>
          </div>

          <div className={"rounded-2xl border border-white/10 w-full aspect-square overflow-hidden flex items-center justify-center " + (removeBg ? "checker" : "bg-[#0b0e13]")}>
            <canvas ref={previewCanvasRef} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-white/70 text-sm mb-1">
              <span>Animation Speed</span>
              <span>{fps} FPS</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </div>

          <div className="mt-4">
            <div className="text-pink-300 text-sm mb-2">Individual Frames</div>
            <div className="grid grid-cols-5 gap-2">
              {frames.map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentFrame(i);
                    setIsPlaying(false);
                  }}
                  className={
                    "relative rounded-xl border " +
                    (currentFrame === i ? "border-pink-500" : "border-white/10") +
                    " bg-[#0b0e13] aspect-square overflow-hidden"
                  }
                >
                  <MiniFrame index={i} removeBg={removeBg} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={downloadSpriteSheet} className="h-11 rounded-xl bg-white/10 hover:bg-white/15 transition">
              Download Sprite Sheet
            </button>
            <button onClick={copyCss} className="h-11 rounded-xl bg-white/10 hover:bg-white/15 transition">
              Copy CSS Animation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-white/70 text-sm">{label}</div>
      {children}
    </div>
  );
}

function MiniFrame({ index, removeBg }: { index: number; removeBg: boolean }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const w = 72,
      h = 72;
    el.width = w;
    el.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    if (!removeBg) {
      ctx.fillStyle = "#0b0e13";
      ctx.fillRect(0, 0, w, h);
    }
    const px = 6;
    const palette = ["#f472b6", "#fb7185", "#38bdf8", "#22c55e", "#a3a3a3"];
    for (let y = 0; y < h; y += px) {
      for (let x = 0; x < w; x += px) {
        const k = ((x + y + index * 6) / px) % palette.length;
        // @ts-ignore
        ctx.fillStyle = palette[Math.floor(k)];
        if (removeBg && (x < px || y < px || x > w - px * 2 || y > h - px * 2)) continue;
        ctx.fillRect(x + (index % 3), y + ((index * 2) % 3), px - 1, px - 1);
      }
    }
    ctx.strokeStyle = "#1e2632";
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [index, removeBg]);
  return <canvas ref={ref} className="w-full h-full" />;
}

function SparklesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="#f472b6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 16V4m0 0l-4 4m4-4l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 20h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
