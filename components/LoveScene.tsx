"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = { to: string; msg: string; date: string };

type Particle =
  | {
      kind: "text";
      x: number;
      y: number;
      vx: number;
      vy: number;
      text: string;
      size: number;
      alpha: number;
      hue: number;
    }
  | {
      kind: "heart";
      x: number;
      y: number;
      vx: number;
      vy: number;
      px: number; // size theo pixel (rõ, không bị quá nhỏ)
      alpha: number;
      hue: number;
      rot: number;
      vr: number;
      pulse: number; // nhịp đập theo nhạc
    };

export default function LoveScene({ to, msg, date }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // WebAudio analyser để lấy amplitude -> tim đập theo nhạc
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const mediaSrcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const beatRef = useRef({
    amp: 0, // 0..1
    smooth: 0, // smoothing
    lastBeat: 0,
  });

  const [started, setStarted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  // text cứng theo yêu cầu
  const TOP_TO_NAME = "Thanh Chúc";

  const phrases = useMemo(() => {
    const base = [
      msg,
      "Làm người yêu anh nhé",
      "Love you",
      `Mãi bên cạnh ${to} nhé`,
      `Hứa sẽ yêu ${to} như ngày đầu`,
      `${to} mãi là công chúa của anh`,
      `Chúc ${to} valentine vui vẻ`,
      date,
    ];
    return base.flatMap((t) => [t, t]);
  }, [to, msg, date]);

  /* ======================= AUDIO ANALYSER ======================= */
  const ensureAnalyser = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // đã tạo rồi thì thôi
    if (audioCtxRef.current && analyserRef.current && dataRef.current) return;

    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx() as AudioContext;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    const src = ctx.createMediaElementSource(audioEl);
    src.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    mediaSrcRef.current = src;
  };

  const readAmplitude = () => {
    const analyser = analyserRef.current;
    const arr = dataRef.current;
    if (!analyser || !arr) return 0;

    analyser.getByteFrequencyData(arr as Uint8Array<ArrayBuffer>);

    // lấy năng lượng dải thấp (bass-ish) để “đập” rõ hơn
    const n = arr.length;
    const lowEnd = Math.max(8, Math.floor(n * 0.18));
    let sum = 0;
    for (let i = 0; i < lowEnd; i++) sum += arr[i];
    const avg = sum / lowEnd; // 0..255
    return Math.min(1, avg / 180); // normalize
  };

  /* ======================= MUSIC ======================= */
  const startExperience = async () => {
    setStarted(true);

    if (!musicOn) return;
    const a = audioRef.current;
    if (!a) return;

    try {
      ensureAnalyser();
      // resume context if suspended (Safari)
      if (audioCtxRef.current?.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      await a.play();
    } catch {
      // ignore autoplay errors
    }
  };

  const toggleMusic = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      try {
        ensureAnalyser();
        if (audioCtxRef.current?.state === "suspended") {
          await audioCtxRef.current.resume();
        }
        await a.play();
        setMusicOn(true);
      } catch {}
    } else {
      a.pause();
      setMusicOn(false);
    }
  };

  /* ======================= CANVAS EFFECT ======================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const particles: Particle[] = [];
    const stars: { x: number; y: number; r: number; a: number }[] = [];

    // đỡ rối mắt
    const MAX_PARTICLES = 75;

    // yêu cầu: chữ cách nhau 1s
    const TEXT_INTERVAL = 1000;

    // tim bay đều
    const HEART_INTERVAL = 500;

    let lastTextTime = 0;
    let lastHeartTime = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // stars
      stars.length = 0;
      const count = Math.floor((w * h) / 14000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.2,
          a: Math.random() * 0.6 + 0.15,
        });
      }
    };

    // tim vẽ theo px => nhìn rõ trên mobile
    const drawHeart = (
      x: number,
      y: number,
      px: number,
      a: number,
      hue: number,
      rot: number
    ) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.rotate(rot);

      // glow theo màu (nhưng vừa phải)
      ctx.shadowColor = `hsla(${hue}, 95%, 65%, 1)`;
      ctx.shadowBlur = 20;

      const s = px / 24; // base 24px
      ctx.scale(s, s);

      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-12, -6, -20, 8, 0, 22);
      ctx.bezierCurveTo(20, 8, 12, -6, 0, 6);
      ctx.closePath();

      ctx.fillStyle = `hsla(${hue}, 95%, 65%, 1)`;
      ctx.fill();
      ctx.restore();
    };

    const spawnText = () => {
      if (particles.length >= MAX_PARTICLES) return;
      const hue = Math.random() * 360;

      particles.push({
        kind: "text",
        x: Math.random() * w,
        y: h + 40,
        vx: (Math.random() - 0.5) * 0.14,
        vy: -(Math.random() * 0.38 + 0.28),
        text: phrases[Math.floor(Math.random() * phrases.length)],
        size: 14 + Math.random() * 8,
        alpha: 0.9,
        hue,
      });
    };

    const spawnHeart = (extraPulse = 0) => {
      if (particles.length >= MAX_PARTICLES) return;
      const hue = Math.random() * 360;

      particles.push({
        kind: "heart",
        x: Math.random() * w,
        y: h + 40,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(Math.random() * 0.42 + 0.30),
        px: 1 + Math.random() * 10, // 18..44px (rõ)
        alpha: 0.95,
        hue,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.03,
        pulse: extraPulse,
      });
    };

    const drawStartScene = () => {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, w, h);

      for (const st of stars) {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // tim giữa nhấp nháy
      const t = Date.now() * 0.004;
      const pulse = 1 + Math.sin(t) * 0.06;
      drawHeart(w / 2, h / 2, 46 * pulse, 1, 330, 0);
    };

    const tick = (t: number) => {
      // cập nhật beat (khi đã có analyser & nhạc đang chạy)
      let amp = 0;
      if (started && musicOn && audioRef.current && !audioRef.current.paused) {
        amp = readAmplitude();
        const b = beatRef.current;

        // smooth amplitude
        b.smooth = b.smooth * 0.82 + amp * 0.18;
        b.amp = b.smooth;

        // detect "beat" thô: vượt ngưỡng + cooldown
        const now = performance.now();
        const beat = b.amp > 0.38 && now - b.lastBeat > 220;
        if (beat) b.lastBeat = now;

        // nếu beat, bơm thêm tim “đập”
        if (beat) {
          spawnHeart(0.55);
          if (Math.random() < 0.5) spawnHeart(0.35);
        }
      } else {
        // giảm dần khi tắt nhạc
        const b = beatRef.current;
        b.smooth = b.smooth * 0.9;
        b.amp = b.smooth;
      }

      if (!started) {
        drawStartScene();
        raf = requestAnimationFrame(tick);
        return;
      }

      // trail
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, 0, w, h);

      // stars
      for (const st of stars) {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ⏱ chữ 1s / dòng
      if (t - lastTextTime >= TEXT_INTERVAL) {
        lastTextTime = t;
        spawnText();
      }

      // ❤️ tim đều đều, nhiều màu
      if (t - lastHeartTime >= HEART_INTERVAL) {
        lastHeartTime = t;
        spawnHeart(beatRef.current.amp * 0.35);
        if (Math.random() < 0.35) spawnHeart(beatRef.current.amp * 0.25);
      }

      const beatAmp = beatRef.current.amp; // 0..1

      // draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.kind === "text") {
          ctx.save();
          ctx.globalAlpha = p.alpha;

          // giảm nhòe
          ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, 0.9)`;
          ctx.shadowBlur = 6;
          ctx.font = `500 ${p.size}px system-ui, -apple-system, Segoe UI, Roboto`;
          ctx.fillStyle = `hsla(${p.hue}, 90%, 72%, 1)`;
          ctx.fillText(p.text, p.x, p.y);
          ctx.restore();
        } else {
          p.rot += p.vr;

          // tim “đập” theo nhạc: scale theo amp + pulse riêng của tim
          const pulse =
            1 +
            Math.min(0.22, beatAmp * 0.22) +
            Math.min(0.18, p.pulse * 0.18);

          // decay pulse
          p.pulse *= 0.92;

          drawHeart(p.x, p.y, p.px * pulse, p.alpha, p.hue, p.rot);
        }
      }

      // cleanup
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].y < -160) particles.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [phrases, started, musicOn]);

  return (
    <div className="relative min-h-dvh overflow-hidden touch-manipulation bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Nhạc: đặt file ở public/music.mp3 */}
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />

      {/* Overlay tim để chắc chắn nhìn thấy và click được */}
      {!started && (
        <button
          onClick={startExperience}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="text-6xl animate-pulse">❤️</div>
          <div className="text-white/85 text-sm font-medium">
            Chạm vào trái tim
          </div>
        </button>
      )}

      {/* Top bar: text cứng 1 dòng + nút nhạc bên phải */}
      {started && (
        <div
          className="absolute top-0 left-0 right-0 z-30 flex items-center px-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
        >
          {/* trái: spacer */}
          <div className="w-16" />

          {/* giữa: luôn 1 dòng */}
          <div className="flex-1 flex justify-center overflow-hidden">
            <div className="px-3 py-1 rounded-full bg-black/35 border border-white/10">
              <span
                className="text-sm font-bold flex items-center gap-1 whitespace-nowrap"
                style={{
                  background:
                    "linear-gradient(90deg, #ff4da6, #ffd54a, #57e389, #4da3ff, #b56bff)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  textShadow: "0 0 14px rgba(255,255,255,0.15)",
                  letterSpacing: "0.3px",
                }}
              >
                --- Gửi Tới {TOP_TO_NAME}
                <span
                  className="ml-1"
                  style={{
                    color: "#32d26e",
                    textShadow: "0 0 8px rgba(50,210,110,0.9)",
                  }}
                >
                  🍀
                </span>
                ---
              </span>
            </div>
          </div>

          {/* phải: nút nhạc */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMusic();
            }}
            className="w-16 flex justify-end"
          >
            <span className="px-3 py-1 rounded-full bg-black/50 text-white text-xs border border-white/10">
              {musicOn ? "🔊 Nhạc" : "🔇 Tắt"}
            </span>
          </button>
        </div>
      )}

      {/* Bottom small label (tùy thích) */}
      {started && (
        <div
          className="absolute bottom-6 w-full text-center text-white/55 text-xs z-10 pointer-events-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {to} · {date}
        </div>
      )}
    </div>
  );
}
