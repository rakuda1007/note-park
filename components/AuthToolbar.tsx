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
  const base =
    variant === "warning"
      ? "rounded px-1 py-1 text-[11px] text-amber-200 hover:bg-teal-900/50 sm:px-1.5 sm:text-sm"
      : "rounded px-1 py-1 text-[11px] text-teal-100 hover:bg-teal-900/50 sm:px-1.5 sm:text-sm";
  return (
    <AccountGroup className={className}>
      <Link
        href={href}
        title="メールアドレスで新規登録またはログイン"
        className={`${base} inline-block max-w-[11rem] leading-snug sm:max-w-none sm:whitespace-nowrap sm:leading-none`.trim()}
      >
        <span className="whitespace-nowrap">新規登録</span>
        <span className="text-zinc-500"> / </span>
        <span className="whitespace-nowrap">ログイン</span>
      </Link>
    </AccountGroup>
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
