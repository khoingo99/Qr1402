import LinkMaker from "@/components/LinkMaker";

export default function Home() {
  return (
    <main className="min-h-dvh bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Love QR</h1>
      <p className="text-white/70 mt-2">Tạo link + QR “text bay bay” như TikTok.</p>
      <div className="mt-6">
        <LinkMaker />
      </div>
    </main>
  );
}
