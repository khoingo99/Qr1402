"use client";
import LoveScene from "@/components/LoveScene";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; msg?: string; date?: string }>;
}) {
  const sp = await searchParams;

  const to = (sp.to ?? "Thanh Chúc").slice(0, 40);
  const msg = (sp.msg ?? "Em mãi là công chúa của anh").slice(0, 120);
  const date = (sp.date ?? "14/02/2026").slice(0, 10);

  return (
    <div className="min-h-dvh bg-black text-white">
      <LoveScene to={to} msg={msg} date={date} />
    </div>
  );
}
