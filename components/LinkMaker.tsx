"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export default function LinkMaker() {
  const [to, setTo] = useState("Em");
  const [msg, setMsg] = useState("Em mãi là công chúa của anh");
  const [date, setDate] = useState("14/02");
  const [qr, setQr] = useState<string>("");

  const url = useMemo(() => {
    const sp = new URLSearchParams({
      to,
      msg,
      date,
    });
    return `${window.location.origin}/v?${sp.toString()}`;
  }, [to, msg, date]);

  useEffect(() => {
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6 });
        setQr(dataUrl);
      } catch {
        setQr("");
      }
    })();
  }, [url]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    alert("Đã copy link!");
  };

  return (
    <div className="grid gap-4 max-w-xl">
      <label className="grid gap-1">
        <span className="text-sm text-white/70">Gửi tới (tên)</span>
        <input className="px-3 py-2 rounded bg-white/10 outline-none" value={to} onChange={(e)=>setTo(e.target.value)} />
      </label>

      <label className="grid gap-1">
        <span className="text-sm text-white/70">Nội dung</span>
        <input className="px-3 py-2 rounded bg-white/10 outline-none" value={msg} onChange={(e)=>setMsg(e.target.value)} />
      </label>

      <label className="grid gap-1">
        <span className="text-sm text-white/70">Ngày</span>
        <input className="px-3 py-2 rounded bg-white/10 outline-none" value={date} onChange={(e)=>setDate(e.target.value)} />
      </label>

      <div className="mt-2 p-3 rounded bg-white/5">
        <div className="text-sm text-white/70">Link:</div>
        <div className="break-all mt-1">{typeof window !== "undefined" ? url : ""}</div>
        <div className="flex gap-2 mt-3">
          <button onClick={copy} className="px-3 py-2 rounded bg-pink-600">Copy link</button>
          <a href={`/v?to=${encodeURIComponent(to)}&msg=${encodeURIComponent(msg)}&date=${encodeURIComponent(date)}`}
             className="px-3 py-2 rounded bg-white/10">
            Xem thử
          </a>
        </div>
      </div>

      {qr && (
        <div className="mt-2">
          <div className="text-sm text-white/70 mb-2">QR để quét:</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="w-52 h-52 rounded bg-white p-2" />
          <div className="text-xs text-white/50 mt-2">Quét QR sẽ mở đúng link ở trên.</div>
        </div>
      )}
    </div>
  );
}
