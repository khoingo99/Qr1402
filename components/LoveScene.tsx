"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = { to: string; msg: string; date: string };

type HeartParticle = {
  kind: "heart";
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number; // size theo pixel
  alpha: number;
  hue: number;
  rot: number;
  vr: number;
  pulse: number; // nhịp đập theo nhạc
};

type TextLine = {
  id: number;
  text: string;
  y: number;
  alpha: number;
  hue: number;
  born: number; // performance.now()
};

export default function LoveScene({ to, msg, date }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // WebAudio analyser để lấy amplitude -> tim đập theo nhạc
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  const beatRef = useRef({
    amp: 0,
    smooth: 0,
    lastBeat: 0,
  });

  const [started, setStarted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  // text cứng theo yêu cầu
  const TOP_TO_NAME = "Thanh Chúc";

  const FINAL_MESSAGE = "Làm người yêu anh nhé 💖";
  const MAX_LINES = 10; // đủ “lyric” rồi chốt
  const POP_MS = 300; // ✨ pop-in 0.3s
  const LINE_GAP = 34;
  const SCROLL_SPEED = 0.42; // tốc độ chữ đi lên

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
    // ưu tiên msg và câu chính xuất hiện nhiều hơn
    return base.flatMap((t) => [t, t]);
  }, [to, msg, date]);

  /* ======================= AUDIO ANALYSER ======================= */
  const ensureAnalyser = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

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
  };

  const readAmplitude = () => {
    const analyser = analyserRef.current;
    const arr = dataRef.current;
    if (!analyser || !arr) return 0;

dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    // lấy năng lượng dải thấp để beat rõ hơn
    const n = arr.length;
    const lowEnd = Math.max(8, Math.floor(n * 0.18));
    let sum = 0;
    for (let i = 0; i < lowEnd; i++) sum += arr[i];
    const avg = sum / lowEnd; // 0..255
    return Math.min(1, avg / 180);
  };

  /* ======================= MUSIC ======================= */
 const startExperience = async () => {
  setStarted(true);

  // 🔥 THÊM DÒNG NÀY: sinh ngay dòng chữ đầu tiên
  requestAnimationFrame(() => {
    const now = performance.now();
    // @ts-ignore – dùng trực tiếp trong effect
    spawnLineCentered?.(now);
  });

  if (!musicOn) return;
  const a = audioRef.current;
  if (!a) return;

  try {
    ensureAnalyser();
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    await a.play();
  } catch {}
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

    const hearts: HeartParticle[] = [];
    const stars: { x: number; y: number; r: number; a: number }[] = [];

    const lines: TextLine[] = [];
    let lineId = 1;
    let showFinal = false;
    let finalAlpha = 0;

    const MAX_HEARTS = 80;

    // Fallback nếu không có beat / không bật nhạc
    const FALLBACK_TEXT_INTERVAL = 1000;
    let lastFallbackText = 0;

    // tim bay đều
    const HEART_INTERVAL = 450;
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

      ctx.shadowColor = `hsla(${hue}, 95%, 65%, 1)`;
      ctx.shadowBlur = 20;

      const s = px / 24;
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

    const spawnHeart = (extraPulse = 0) => {
      if (hearts.length >= MAX_HEARTS) return;
      const hue = Math.random() * 360;

      hearts.push({
        kind: "heart",
        x: Math.random() * w,
        y: h + 40,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(Math.random() * 0.42 + 0.30),
        px: 1+ Math.random() * 10, // ✅ tim rõ (18..44)
        alpha: 0.95,
        hue,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.03,
        pulse: extraPulse,
      });
    };

    const nextPhrase = () => phrases[Math.floor(Math.random() * phrases.length)];

    // ✅ Chữ luôn ở GIỮA, xếp hàng theo thứ tự, không chạy lộn nhau
    const spawnLineCentered = (now: number) => {
      if (showFinal) return;
      if (lines.length >= MAX_LINES) {
        showFinal = true;
        return;
      }

      const hue = Math.random() * 360;
      const centerY = h / 2;

      // dòng mới luôn nằm “cuối stack”
      lines.push({
        id: lineId++,
        text: nextPhrase(),
        y: centerY + lines.length * LINE_GAP,
        alpha: 0,
        hue,
        born: now,
      });

      if (lines.length >= MAX_LINES) {
        // ngay sau khi đủ dòng -> chốt
        showFinal = true;
      }
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

      const t = Date.now() * 0.004;
      const pulse = 1 + Math.sin(t) * 0.06;
      drawHeart(w / 2, h / 2, 46 * pulse, 1, 330, 0);
    };

    const tick = (t: number) => {
      // update beat
      if (started && musicOn && audioRef.current && !audioRef.current.paused) {
        const amp = readAmplitude();
        const b = beatRef.current;

        b.smooth = b.smooth * 0.82 + amp * 0.18;
        b.amp = b.smooth;

        const now = performance.now();
        const isBeat = b.amp > 0.38 && now - b.lastBeat > 240;
        if (isBeat) b.lastBeat = now;

        // 🎵 Đồng bộ dòng mới theo beat
        if (isBeat) {
          spawnLineCentered(now);

          // beat thì bơm thêm tim “đập”
          spawnHeart(0.55);
          if (Math.random() < 0.45) spawnHeart(0.35);
        }
      } else {
        // decay khi tắt nhạc
        const b = beatRef.current;
        b.smooth = b.smooth * 0.9;
        b.amp = b.smooth;
      }

      if (!started) {
        drawStartScene();
        raf = requestAnimationFrame(tick);
        return;
      }

      // background trail
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

      const now = performance.now();

      // fallback: nếu không có beat (hoặc tắt nhạc) -> 1s / dòng
      const playing = musicOn && audioRef.current && !audioRef.current.paused;
      if (!playing && !showFinal) {
        if (now - lastFallbackText >= FALLBACK_TEXT_INTERVAL) {
          lastFallbackText = now;
          spawnLineCentered(now);
        }
      }

      // ❤️ tim bay đều (kể cả khi không beat)
      if (now - lastHeartTime >= HEART_INTERVAL) {
        lastHeartTime = now;
        spawnHeart(beatRef.current.amp * 0.35);
        if (Math.random() < 0.35) spawnHeart(beatRef.current.amp * 0.25);
      }

      const beatAmp = beatRef.current.amp;

      // ====== Update & draw TEXT LINES (center + ordered) ======
      const centerY = h / 2;

      // 🫶 Khi showFinal -> “đứng lại”: không scroll nữa
      const allowScroll = !showFinal;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // fade in
        line.alpha = Math.min(1, line.alpha + 0.035);

        // giữ stack đúng khoảng cách: baseY theo index
        // base mục tiêu:
        const targetY = centerY + i * LINE_GAP;

        // nhẹ nhàng kéo về đúng target (tránh lộn xộn)
        line.y += (targetY - line.y) * 0.12;

        // scroll toàn stack lên
        if (allowScroll && lines.length > 1) {
          line.y -= SCROLL_SPEED;
        }

        // ✨ pop-in 0.3s cho dòng mới
        const age = now - line.born;
        const popT = Math.min(1, Math.max(0, age / POP_MS));
        const popScale = 1 + (1 - popT) * 0.18; // bắt đầu lớn hơn, rồi về 1

        ctx.save();
        ctx.globalAlpha = line.alpha;

        ctx.textAlign = "center";
        ctx.shadowColor = `hsla(${line.hue}, 90%, 65%, 0.85)`;
        ctx.shadowBlur = 6;

        ctx.font = `500 20px system-ui, -apple-system, Segoe UI, Roboto`;
        ctx.fillStyle = `hsla(${line.hue}, 90%, 72%, 1)`;

        ctx.translate(w / 2, line.y);
        ctx.scale(popScale, popScale);
        ctx.fillText(line.text, 0, 0);

        ctx.restore();
      }

      // cleanup text (khi còn scroll)
      if (allowScroll) {
        while (lines.length && lines[0].y < -60) {
          lines.shift();
        }
      }

      // 🫶 Final message (fade in, đứng lại)
      if (showFinal) {
        finalAlpha = Math.min(1, finalAlpha + 0.02);

        ctx.save();
        ctx.globalAlpha = finalAlpha;

        const hue = 330;
        ctx.textAlign = "center";
        ctx.shadowColor = `hsla(${hue}, 95%, 65%, 1)`;
        ctx.shadowBlur = 18;

        const beatPulse = 1 + Math.min(0.18, beatAmp * 0.18);
        ctx.translate(w / 2, centerY + 10);
        ctx.scale(beatPulse, beatPulse);

        ctx.font = `700 26px system-ui, -apple-system, Segoe UI, Roboto`;
        ctx.fillStyle = `hsla(${hue}, 95%, 70%, 1)`;
        ctx.fillText(FINAL_MESSAGE, 0, 0);
        ctx.restore();
      }

      // ====== Update & draw HEARTS ======
      for (const p of hearts) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        const pulse =
          1 +
          Math.min(0.22, beatAmp * 0.22) +
          Math.min(0.18, p.pulse * 0.18);

        p.pulse *= 0.92;

        drawHeart(p.x, p.y, p.px * pulse, p.alpha, p.hue, p.rot);
      }

      for (let i = hearts.length - 1; i >= 0; i--) {
        if (hearts[i].y < -180) hearts.splice(i, 1);
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
          <div className="w-16" />

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

      {/* Bottom small label */}
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
