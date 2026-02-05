"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export default function LinkMaker() {
  const [to, setTo] = useState("Thanh Chúc");
  const [msg, setMsg] = useState("Làm người yêu anh nhé");
  const [date, setDate] = useState("14/02");
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const path = useMemo(() => {
    const sp = new URLSearchParams({ to, msg, date });
    return `/v?${sp.toString()}`;
  }, [to, msg, date]);

  const fullUrl = origin ? `${origin}${path}` : "";

  useEffect(() => {
    (async () => {
      if (!fullUrl) return;
      const dataUrl = await QRCode.toDataURL(fullUrl, { margin: 1, scale: 6 });
      setQr(dataUrl);
    })();
  }, [fullUrl]);

  return (
    <div className="grid gap-4 max-w-xl">
      <label className="grid gap-1">
        <span className="text-sm text-white/70">Gửi tới</span>
        <input
          className="px-3 py-2 rounded bg-white/10 outline-none"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm text-white/70">Nội dung</span>
        <input
          className="px-3 py-2 rounded bg-white/10 outline-none"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm text-white/70">Ngày</span>
        <input
          className="px-3 py-2 rounded bg-white/10 outline-none"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <div className="p-3 rounded bg-white/5">
        <div className="text-sm text-white/70">Link:</div>
        <div className="break-all mt-1">{origin ? fullUrl : "Loading..."}</div>
        <div className="flex gap-2 mt-3">
          <a className="px-3 py-2 rounded bg-pink-600" href={path}>
            Xem thử
          </a>
          <button
            className="px-3 py-2 rounded bg-white/10"
            onClick={async () => {
              if (!fullUrl) return;
              await navigator.clipboard.writeText(fullUrl);
              alert("Đã copy link!");
            }}
          >
            Copy link
          </button>
        </div>
      </div>

      {qr && (
        <div>
          <div className="text-sm text-white/70 mb-2">QR:</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="w-52 h-52 rounded bg-white p-2" />
        </div>
      )}
    </div>
  );
}
