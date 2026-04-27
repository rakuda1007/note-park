"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";

type Props = {
  className?: string;
};

function AccountGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label="アカウント"
      className={`shrink-0 rounded-md border border-zinc-600/40 bg-zinc-900/30 px-1 py-0.5 sm:px-1.5 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function AuthEntryLink({
  href,
  variant,
  className,
}: {
  href: string;
  variant: "default" | "warning";
  className?: string;
}) {
  const loginClass =
    variant === "warning"
      ? "text-xs font-medium text-amber-200 hover:text-amber-100 sm:text-sm"
      : "text-xs font-medium text-teal-100 hover:text-teal-50 sm:text-sm";
  const signupClass =
    variant === "warning"
      ? "rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-400 sm:px-3 sm:py-1.5 sm:text-sm"
      : "rounded-md bg-teal-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-400 sm:px-3 sm:py-1.5 sm:text-sm";

  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`.trim()}>
      <Link
        href={href}
        title="メールアドレスでログイン"
        className={loginClass}
      >
        ログイン
      </Link>
      <Link
        href={href}
        title="メールアドレスで新規登録"
        className={signupClass}
      >
        新規登録
      </Link>
    </div>
  );
}

/**
 * Firebase 利用時: 未ログインは「新規登録 / ログイン」、ログイン中はアカウント表示とログアウト。
 * Firebase 未設定時は何も出さない（ローカル専用）。
 */
export default function AuthToolbar({ className = "" }: Props) {
  const auth = useNoteAuth();

  if (!isFirebaseConfigured()) return null;

  if (auth.status === "loading" || auth.status === "migrating") {
    return (
      <span
        className={`text-xs text-teal-200/90 ${className}`.trim()}
        title={auth.status === "migrating" ? "未ログイン時のメモを同期しています" : "認証の準備中"}
      >
        {auth.status === "migrating" ? "同期中…" : "準備中…"}
      </span>
    );
  }

  if (auth.status === "error") {
    return <AuthEntryLink href="/auth" variant="warning" className={className} />;
  }

  if (auth.isCloud && auth.status === "ready") {
    return (
      <AccountGroup className={className}>
        <div className="flex min-w-0 max-w-[9.5rem] items-center gap-1 sm:max-w-xs sm:gap-2">
          <span
            className="hidden min-w-0 flex-1 truncate text-xs text-zinc-400 sm:block"
            title={auth.userEmail ?? ""}
          >
            {auth.userEmail ?? "ログイン中"}
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

  return <AuthEntryLink href="/auth" variant="default" className={className} />;
}
