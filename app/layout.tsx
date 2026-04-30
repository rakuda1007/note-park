import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PwaResumeHandler from "@/components/PwaResumeHandler";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

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
        <ServiceWorkerRegister />
        <PwaResumeHandler />
        <AppErrorBoundary>
          {children}
        </AppErrorBoundary>
      </body>
    </html>
  );
}
