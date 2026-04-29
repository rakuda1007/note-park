import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default function PortalPage() {
  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
      <AppHeader />
      <main className="mx-auto w-full min-w-0 max-w-lg px-4 pb-16 pt-8">
        <section className="rounded-2xl border border-teal-900/40 bg-teal-950/20 p-5 sm:p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Note Park ポータル</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            ひらいてすぐ書ける、軽量メモアプリです。ログイン状態にかかわらずここからアクセスできます。
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            メインページでは、現在の仕様どおりログイン状態に応じた保存先で動作します。
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400"
            >
              いますぐメモを取る
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
