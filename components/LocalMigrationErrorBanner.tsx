"use client";

import { useState } from "react";
import { useLocalMigrationRetry, useNoteAuth } from "@/lib/hooks/useNoteAuth";

/**
 * ログイン直後の localStorage → Firestore 移行失敗時に表示。ログアウトはせず再同期可能。
 */
export default function LocalMigrationErrorBanner() {
  const auth = useNoteAuth();
  const { retryLocalMigration } = useLocalMigrationRetry();
  const [busy, setBusy] = useState(false);

  if (auth.status !== "ready") return null;
  if (!auth.migrationError) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/40 px-3 py-3 text-sm text-amber-100"
      role="status"
    >
      <p className="mb-2 leading-relaxed text-amber-50/95">{auth.migrationError}</p>
      <button
        type="button"
        disabled={busy}
        className="rounded-md bg-amber-700/80 px-3 py-1.5 text-xs font-medium text-amber-50 hover:bg-amber-600/90 disabled:opacity-50"
        onClick={() => {
          setBusy(true);
          void retryLocalMigration()
            .catch(() => {})
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "同期中…" : "もう一度同期"}
      </button>
    </div>
  );
}
