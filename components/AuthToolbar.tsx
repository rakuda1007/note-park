"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { isAdminModeEnabled } from "@/lib/ads/preferences";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";

type Props = {
  className?: string;
};

function AccountGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label="クラウド同期"
      className={`shrink-0 rounded-md border border-zinc-600/40 bg-zinc-900/30 px-1 py-0.5 sm:px-1.5 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/**
 * 管理者モード時のみ表示。Firebase ログインでクラウド同期（一般ユーザーには非公開）。
 */
export default function AuthToolbar({ className = "" }: Props) {
  const auth = useNoteAuth();

  if (!isAdminModeEnabled()) return null;
  if (!isFirebaseConfigured()) {
    return (
      <span className={`text-xs text-amber-200/90 ${className}`.trim()} title="Firebase 未設定">
        同期不可
      </span>
    );
  }

  if (auth.status === "loading" || auth.status === "migrating") {
    return (
      <span
        className={`text-xs text-teal-200/90 ${className}`.trim()}
        title={auth.status === "migrating" ? "ローカルメモをクラウドへ同期中" : "認証の準備中"}
      >
        {auth.status === "migrating" ? "同期中…" : "準備中…"}
      </span>
    );
  }

  if (auth.status === "error") {
    return (
      <Link
        href="/auth"
        className={`text-xs font-medium text-amber-200 hover:text-amber-100 sm:text-sm ${className}`.trim()}
      >
        同期エラー
      </Link>
    );
  }

  if (auth.isCloud && auth.status === "ready") {
    return (
      <AccountGroup className={className}>
        <div className="flex min-w-0 max-w-[9.5rem] items-center gap-1 sm:max-w-xs sm:gap-2">
          <span
            className="hidden min-w-0 flex-1 truncate text-xs text-zinc-400 sm:block"
            title={auth.userEmail ?? "クラウド同期中"}
          >
            {auth.userEmail ?? "同期中"}
          </span>
          <button
            type="button"
            className="shrink-0 rounded px-1.5 py-1 text-xs text-teal-100 hover:bg-teal-900/50 sm:text-sm"
            onClick={() => {
              void signOut(getFirebaseAuth());
            }}
          >
            ログアウト
          </button>
        </div>
      </AccountGroup>
    );
  }

  return (
    <Link
      href="/auth"
      title="管理者アカウントでクラウド同期"
      className={`rounded-md bg-teal-800/80 px-2 py-1 text-xs font-medium text-teal-50 hover:bg-teal-700/80 sm:px-2.5 sm:text-sm ${className}`.trim()}
    >
      クラウド同期
    </Link>
  );
}
