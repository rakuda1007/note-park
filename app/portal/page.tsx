import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PortalDemo from "./PortalDemo";

export const metadata: Metadata = {
  title: "Note Park — 思考を、1秒も待たせない",
  description:
    "ログイン・アカウント不要。ブラウザを開けばすぐ書けるノート。自動保存とシンプルな画面で、思考の流れを止めません。",
};

/** [Park シリーズ公式](https://series.tennis-park-community.com/) の表記に基づく */
const SERIES_PORTAL_HREF = "https://series.tennis-park-community.com/";

const PARK_SIBLINGS = [
  {
    name: "テニスパーク",
    category: "テニスサークル運営",
    description:
      "テニス活動を記録・管理。練習メモや試合結果を残し、あとから振り返って次の練習に活かせます。",
    href: "https://tennis-park-community.com/",
    logoSrc: "https://series.tennis-park-community.com/tennis-icon-512x512.png",
    ringClass: "ring-emerald-500/15 hover:ring-emerald-400/35",
    glowClass: "from-emerald-500/[0.07] to-transparent",
  },
  {
    name: "トリップパーク",
    category: "旅行管理",
    description:
      "旅行計画をひとまとめ。行きたい場所や持ち物、やることを整理して、グループ旅行の準備もスムーズに進められます。",
    href: "https://trip.tennis-park-community.com/portal",
    logoSrc: "https://series.tennis-park-community.com/TripPark.png",
    ringClass: "ring-amber-500/15 hover:ring-amber-400/35",
    glowClass: "from-amber-500/[0.08] to-transparent",
  },
  {
    name: "ヘルスパーク",
    category: "健康管理",
    description:
      "体重・血圧・歩数をサクッと記録。日々の変化を見ながら、無理なく続ける健康管理に役立ちます。",
    href: "https://health.tennis-park-community.com/portal",
    logoSrc: "https://series.tennis-park-community.com/HealthPark.png",
    ringClass: "ring-rose-500/15 hover:ring-rose-400/35",
    glowClass: "from-rose-500/[0.07] to-transparent",
  },
] as const;

const checkIcon = (
  <span
    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800"
    aria-hidden
  >
    ✓
  </span>
);

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
          {checkIcon}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PortalPage() {
  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-[#fafafa] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-slate-900 hover:text-sky-800"
          >
            Note Park
          </Link>
          <Link
            href="/"
            className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            ノートを開く
          </Link>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="border-b border-slate-200/60 bg-white">
        <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-10 px-4 py-12 md:grid-cols-2 md:gap-12 md:py-16 lg:py-20">
          <div className="order-2 min-w-0 md:order-1">
            <p className="text-sm font-medium text-sky-700">摩擦ゼロのメモ体験</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
              思考を、1秒も待たせない。
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
              アプリの起動も、アカウント作成も、ログインも不要。
              <br className="hidden sm:block" />
              あなたのブラウザが、そのまま「世界で一番速く書き始められるノート」になります。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-md shadow-sky-600/25 transition hover:bg-sky-500"
              >
                今すぐノートを開く（登録不要）
              </Link>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative mx-auto aspect-[4/3] max-w-xl overflow-hidden rounded-2xl bg-slate-100 shadow-xl ring-1 ring-slate-900/5">
              <Image
                src="/noteMain_s.jpg"
                alt="ノートとアイデアのイメージ"
                width={640}
                height={480}
                priority
                className="h-full w-full object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* デモ */}
      <section className="border-b border-slate-200/60 bg-slate-50/80 py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl">
            <PortalDemo />
          </div>
        </div>
      </section>

      {/* POINT 01 */}
      <section className="border-b border-slate-200/60 bg-white py-14 md:py-20" aria-labelledby="point-01">
        <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-10 px-4 md:grid-cols-2 md:gap-14">
          <div className="relative aspect-[640/427] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-900/5">
            <Image
              src="/login2_s.jpg"
              alt="ログイン画面のストレスをイメージした写真"
              width={640}
              height={427}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sky-700">POINT 01</p>
            <h2 id="point-01" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              ログインなし、ストレスなし
            </h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">「書こう」と思ったその瞬間に。</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              アカウント作成の手間は一切ありません。URLをクリックした瞬間、そこはあなたの自由なキャンバスです。急なアイデアも、忘れたくないメモも、逃さずキャッチします。
            </p>
            <BulletList items={["登録不要で全機能が開放", "個人情報の入力も一切なし"]} />
          </div>
        </div>
      </section>

      {/* POINT 02 */}
      <section className="border-b border-slate-200/60 bg-slate-50/50 py-14 md:py-20" aria-labelledby="point-02">
        <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-10 px-4 md:grid-cols-2 md:gap-14">
          <div className="min-w-0 md:order-1">
            <p className="text-sm font-semibold text-sky-700">POINT 02</p>
            <h2 id="point-02" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              閉じるだけで、自動保存
            </h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">「保存ボタン」を押す必要すらありません。</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              書いた内容は、あなたのブラウザにリアルタイムで自動保存されます。不意にブラウザを閉じても、ネットが切れても大丈夫。次に訪れたとき、続きからすぐに再開できます。
            </p>
            <BulletList items={["ブラウザのローカルストレージを活用", "オフライン環境でも執筆可能"]} />
          </div>
          <div className="relative aspect-[640/478] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-900/5 md:order-2">
            <Image
              src="/memo2_s.jpg"
              alt="メモがすぐ手元にあるイメージ"
              width={640}
              height={478}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* POINT 03 */}
      <section className="border-b border-slate-200/60 bg-white py-14 md:py-20" aria-labelledby="point-03">
        <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-10 px-4 md:grid-cols-2 md:gap-14">
          <div className="relative aspect-[640/427] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-900/5">
            <Image
              src="/memo4_s.jpg"
              alt="集中とシンプルさのイメージ"
              width={640}
              height={427}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sky-700">POINT 03</p>
            <h2 id="point-03" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              集中力を削がない「無」のデザイン
            </h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">「書くこと」以外、何も置かない。</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              派手な装飾や複雑な設定、煩わしい広告は排除しました。目に優しいフォントと、十分な余白。あなたの思考を邪魔するものは何一つありません。
            </p>
            <BulletList items={["気が散らないシンプルUI", "長文でも読みやすいタイポグラフィ"]} />
          </div>
        </div>
      </section>

      {/* パークシリーズ ハブ（公式ポータルの訴求に合わせて強化） */}
      <section
        id="park-series"
        className="relative overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-sky-50/40 via-slate-50 to-slate-100/90 py-16 md:py-24"
        aria-labelledby="park-hub-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/4 h-64 w-64 rounded-full bg-sky-200/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-emerald-200/15 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-800/80">
            Park シリーズ
          </p>
          <h2
            id="park-hub-heading"
            className="mx-auto mt-2 max-w-3xl text-center text-2xl font-bold leading-snug tracking-tight text-slate-900 md:text-3xl md:leading-tight"
          >
            日々の活動を、もっとスムーズに。
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-lg font-medium text-slate-700 md:text-xl">
            生活をパークのように楽しく管理するアプリシリーズ
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-relaxed text-slate-600 md:text-base">
            メモ・健康・旅行・スポーツ。日々の「記録」「計画」を、ばらばらのアプリではなく同じ世界観でまとめることで、迷わず続けやすくします。テニスの練習メモ、旅行の持ち物、健康の数値——まず受け止めるのがノートパーク。そこから各パークへ橋をかけられます。
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
            丸いエンブレムでそろえた共通のトーン。現場の運営の手間を減らし、生活の切り替えコストを下げることを目指しています（
            <a
              href={SERIES_PORTAL_HREF}
              className="font-medium text-sky-800 underline decoration-sky-300/80 underline-offset-2 hover:text-sky-950"
              target="_blank"
              rel="noopener noreferrer"
            >
              Park シリーズ公式ポータル
            </a>
            ）。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={SERIES_PORTAL_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white px-5 py-2.5 text-sm font-semibold text-sky-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/80 hover:shadow-md"
            >
              シリーズ公式サイトを見る
              <span aria-hidden className="text-sky-600">
                →
              </span>
            </a>
          </div>

          <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {PARK_SIBLINGS.map((app) => (
              <li key={app.name} className="min-w-0">
                <a
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-900/[0.04] ring-2 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/[0.07] ${app.ringClass}`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100 ${app.glowClass}`}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-4">
                    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200/80 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 外部シリーズ公式の静的ロゴ */}
                      <img
                        src={app.logoSrc}
                        alt={`${app.name}のロゴ`}
                        width={56}
                        height={56}
                        className="h-12 w-12 object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {app.category}
                      </span>
                      <span className="mt-0.5 block text-lg font-bold tracking-tight text-slate-900">
                        {app.name}
                      </span>
                    </div>
                  </div>
                  <p className="relative mt-4 text-sm leading-relaxed text-slate-600">{app.description}</p>
                  <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 transition group-hover:gap-2">
                    アプリを開く
                    <span aria-hidden>→</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* フッター CTA */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-lg font-semibold text-slate-900">さあ、一行目を書きましょう。</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-500"
          >
            今すぐノートを開く（登録不要）
          </Link>
          <p className="mt-8 text-xs text-slate-500">© Note Park</p>
        </div>
      </footer>
    </div>
  );
}
