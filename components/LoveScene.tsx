"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = { to: string; msg: string; date: string };

type Heart = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  rot: number;
  vr: number;
  pulse: number;
};

type TextLine = {
  text: string;
  y: number;
  born: number;
  alpha: number;
  hue: number;
};

export default function LoveScene({ to, msg, date }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  const [started, setStarted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  /* ================= CONFIG ================= */
  const TEXT_DELAY = 5000; // ⏳ 5s sau click mới hiện chữ
  const TEXT_INTERVAL = 1500; // ⏱ 1s / dòng
  const TEXT_LIFETIME = 5000; // 🌫 5s thì mờ dần
  const TEXT_SPEED = 0.55; // ⬆️ tốc độ đi lên
  const LINE_GAP = 32;

  const TOP_TO_NAME = "Thanh Chúc";

const phrases = useMemo(
  () => [
    msg,
    "Anh muốn được đồng hành cùng em",
     "Anh muốn được chăm sóc em",
     "Anh muốn được lo cho em",
     "Anh muốn được làm chỗ dựa cho em",
    "Nếu em đang mỉm cười…",
    "Thì quay sang nhìn anh nhé!",
       "Làm người yêu anh nhé",
        "우리 만나볼래?",
         "내 마음을 받아줘",
          "I Love you",
           "Cảm ơn em đã bước vào cuộc đời anh",
          "Mãi bên cạnh anh,em nhé!",
          "Cùng anh chia sẻ mọi buồn vui em nhé",
    date,
  ].filter((p): p is string => p !== undefined),
  [to, msg, date]
);

  /* ================= AUDIO ================= */
  const ensureAnalyser = () => {
    if (audioCtxRef.current) return;
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx || !audioRef.current) return;

    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const src = ctx.createMediaElementSource(audioRef.current);
    src.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);
  };

  const getBeat = () => {
    if (!analyserRef.current || !dataRef.current) return 0;
    analyserRef.current.getByteFrequencyData(dataRef.current as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += dataRef.current[i];
    return Math.min(1, sum / 1000);
  };

  const start = async () => {
    setStarted(true);
    if (!musicOn || !audioRef.current) return;
    try {
      ensureAnalyser();
      await audioCtxRef.current?.resume();
      await audioRef.current.play();
    } catch {}
  };

  const toggleMusic = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      ensureAnalyser();
      await audioRef.current.play();
      setMusicOn(true);
    } else {
      audioRef.current.pause();
      setMusicOn(false);
    }
  };

  /* ================= CANVAS ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0,
      h = 0,
      raf = 0;

    const hearts: Heart[] = [];
    const lines: TextLine[] = [];

    let startTime = 0;
    let lastText = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };

    const drawHeart = (p: Heart) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.shadowColor = `hsla(${p.hue},90%,65%,1)`;
      ctx.shadowBlur = 15;
      const s = p.size / 24;
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-12, -6, -20, 8, 0, 22);
      ctx.bezierCurveTo(20, 8, 12, -6, 0, 6);
      ctx.fillStyle = `hsla(${p.hue},90%,65%,1)`;
      ctx.fill();
      ctx.restore();
    };

    const spawnHeart = (pulse = 0) => {
      hearts.push({
        x: Math.random() * w,
        y: h + 20,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.5 + 0.3),
        size: 1+ Math.random() * 15,
        hue: Math.random() * 360,
        alpha: 0.9,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.03,
        pulse,
      });
    };
    let phraseIndex = 0;
    const spawnText = (now: number) => {
  lines.push({
    text: phrases[phraseIndex % phrases.length] || "",
    y: h + lines.length * LINE_GAP,
    born: now,
    alpha: 0,
    hue: Math.random() * 360,
  });

  phraseIndex++;
};

    const tick = (t: number) => {
      if (!startTime && started) startTime = t;

      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, w, h);

      // ❤️ hearts
      const beat = getBeat();
      if (Math.random() < 0.05) spawnHeart(beat);
      hearts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.pulse *= 0.9;
        drawHeart(p);
      });
      for (let i = hearts.length - 1; i >= 0; i--) {
        if (hearts[i].y < -100) hearts.splice(i, 1);
      }

      // ⏳ wait 5s then spawn text
      if (started && t - startTime > TEXT_DELAY) {
        if (t - lastText > TEXT_INTERVAL) {
          lastText = t;
          spawnText(t);
        }
      }

      // ⬆️ draw text
      ctx.textAlign = "center";
      lines.forEach((l) => {
        const age = t - l.born;
        l.y -= TEXT_SPEED;

        // fade in
        if (l.alpha < 1) l.alpha += 0.03;

        // fade out after 5s
        if (age > TEXT_LIFETIME) {
          l.alpha -= 0.02;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, l.alpha);
        ctx.shadowColor = `hsla(${l.hue},90%,65%,0.8)`;
        ctx.shadowBlur = 6;
        ctx.font = "500 20px system-ui";
        ctx.fillStyle = `hsla(${l.hue},90%,72%,1)`;
        ctx.fillText(l.text, w / 2, l.y);
        ctx.restore();
      });

      // cleanup text
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].alpha <= 0) lines.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [started, phrases]);

  /* ================= RENDER ================= */
  return (
    <div className="relative min-h-dvh bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />

      {!started && (
        <button
          onClick={start}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-white"
        >
          <div className="text-6xl animate-pulse">❤️</div>
          <div className="text-sm opacity-80">Chạm vào trái tim</div>
        </button>
      )}

      {started && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center px-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }} > {/* trái: spacer */} <div /> {/* giữa: luôn 1 dòng */} <div className="flex-1 flex justify-center overflow-hidden"> <div className="px-3 py-1 rounded-full bg-black/35 border border-white/10"> <span className="text-sm font-bold flex items-center gap-1 whitespace-nowrap" style={{ background: "linear-gradient(90deg, #ff4da6, #ffd54a, #57e389, #4da3ff, #b56bff)", WebkitBackgroundClip: "text", color: "transparent", textShadow: "0 0 14px rgba(255,255,255,0.15)", letterSpacing: "0.3px", }} > --- Gửi Tới {TOP_TO_NAME} <span style={{ color: "#32d26e", textShadow: "0 0 8px rgba(50,210,110,0.9)", }} > 🍀 </span> --- </span> </div> </div>
        </div>
      )}
    </div>
  );
}
