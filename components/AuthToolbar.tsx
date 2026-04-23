"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";

type Props = {
  className?: string;
};

/**
 * Firebase 利用時: 未ログインは「ログイン」、ログイン中はアカウント表示とログアウト。
 * Firebase 未設定時は何も出さない（ローカル専用）。
 */
export default function AuthToolbar({ className = "" }: Props) {
  const auth = useNoteAuth();

  if (!isFirebaseConfigured()) return null;

  if (auth.status === "loading" || auth.status === "migrating") {
    return (
      <span className={`text-xs text-zinc-500 ${className}`.trim()}>
        {auth.status === "migrating" ? "同期中…" : "…"}
      </span>
    );
  }

  if (auth.status === "error") {
    return (
      <Link
        href="/auth"
        className={`rounded-md px-2 py-1.5 text-xs text-amber-200 hover:bg-teal-900/50 sm:text-sm ${className}`.trim()}
      >
        ログイン
      </Link>
    );
  }

  if (auth.isCloud && auth.status === "ready") {
    return (
      <div className={`flex min-w-0 max-w-[10rem] items-center gap-1 sm:max-w-xs sm:gap-2 ${className}`.trim()}>
        <span className="hidden truncate text-xs text-zinc-400 sm:block" title={auth.userEmail ?? ""}>
          {auth.userEmail ?? "ログイン中"}
        </span>
        <button
          type="button"
          className="shrink-0 rounded-md px-2 py-1.5 text-xs text-teal-100 hover:bg-teal-900/50 sm:text-sm"
          onClick={() => {
            void signOut(getFirebaseAuth());
          }}
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      className={`rounded-md px-2 py-1.5 text-xs text-teal-100 hover:bg-teal-900/50 sm:text-sm ${className}`.trim()}
    >
      ログイン
    </Link>
  );
}
