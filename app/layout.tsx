import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    icon: [{ url: "/icons/NotePark.png", type: "image/png" }],
    apple: [{ url: "/icons/NotePark.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
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
        {children}
      </body>
    </html>
  );
}
