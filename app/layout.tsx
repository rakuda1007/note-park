import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PwaResumeHandler from "@/components/PwaResumeHandler";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
/** 管理者PIN検証用（平文ではなく SHA-256 16進）。クライアントは meta からも読む。 */
const ADMIN_PIN_SHA256_PUBLIC = (process.env.NEXT_PUBLIC_ADMIN_PIN_SHA256 ?? "").trim().toLowerCase();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Note Park",
  description: "素早くメモを取るノートアプリ",
  applicationName: "Note Park",
  appleWebApp: {
    capable: true,
    title: "Note Park",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/icons/NotePark.png", type: "image/png" }],
  },
  /** 管理者PIN検証用ハッシュ（平文PINは入れない）。クライアントは meta から読む。 */
  other: {
    "note-park-admin-pin-sha256": ADMIN_PIN_SHA256_PUBLIC,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /** 実機のノッチ／ホームインジケータ内に余白を取れるよう env(safe-area-inset-*) を有効化 */
  viewportFit: "cover",
  themeColor: "#115e59",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
      >
        {GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
              strategy="afterInteractive"
            />
            <Script id="note-park-ga4-init" strategy="afterInteractive">
              {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", ${JSON.stringify(GA_MEASUREMENT_ID)});
`}
            </Script>
          </>
        ) : null}
        <ServiceWorkerRegister />
        <PwaResumeHandler />
        <AppErrorBoundary>
          {children}
        </AppErrorBoundary>
      </body>
    </html>
  );
}
