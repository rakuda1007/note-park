"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const BG_MS = 2500;

/**
 * スタンドアロン（ホーム画面アイコン）で、しばらくバックグラウンドのあと復帰したとき:
 * - 別画面なら / へ
 * - すでに / なら NoteEditor に再マウント用イベントを送る
 */
export default function PwaResumeHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const hiddenAtRef = useRef<number>(0);

  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (document.visibilityState !== "visible") return;

      const hidden = hiddenAtRef.current;
      hiddenAtRef.current = 0;
      if (!hidden) return;

      const delta = Date.now() - hidden;
      if (delta < BG_MS) return;

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;
      if (!standalone) return;

      if (pathname !== "/") {
        router.replace("/");
      } else {
        window.dispatchEvent(new CustomEvent("note-park-pwa-resume"));
      }
    };

    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [pathname, router]);

  return null;
}
