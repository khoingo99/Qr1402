import dynamic from "next/dynamic";

const LinkMaker = dynamic(() => import("@/components/LinkMaker"), {
  ssr: false,
  loading: () => (
    <main className="min-h-dvh bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Love QR</h1>
      <p className="text-white/70 mt-2">Loading...</p>
    </main>
  ),
});

export default function Home() {
  return (
    <main className="min-h-dvh bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Love QR</h1>
      <p className="text-white/70 mt-2">
        Tạo link + QR (an toàn build Vercel).
      </p>
      <div className="mt-6">
        <LinkMaker />
      </div>
    </main>
  );
}
