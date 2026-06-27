"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import AppHeader from "@/components/AppHeader";
import { isAdminModeEnabled } from "@/lib/ads/preferences";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function formatAuthError(err: unknown, fallback: string): string {
  const code = err instanceof FirebaseError ? err.code : "";
  if (code === "auth/operation-not-allowed") {
    return "メール／パスワードのサインインがこの Firebase プロジェクトで有効になっていません。Firebase コンソール（このプロジェクト）→「構築」→「Authentication」→「Sign-in method」で「メール／パスワード」を有効にしてください。";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [adminReady, setAdminReady] = useState(false);

  useEffect(() => {
    setAdminReady(isAdminModeEnabled());
  }, []);

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
        <AppHeader
          showPortalLink
          end={
            <Link href="/" className="text-sm text-teal-200 hover:underline">
              ホーム
            </Link>
          }
        />
        <main className="mx-auto w-full min-w-0 max-w-md px-4 py-8">
          <p className="text-zinc-400">Firebase が未設定のため、クラウド同期は利用できません。</p>
        </main>
      </div>
    );
  }

  if (!adminReady) {
    return (
      <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
        <AppHeader
          showPortalLink
          end={
            <Link href="/" className="text-sm text-teal-200 hover:underline">
              ホーム
            </Link>
          }
        />
        <main className="mx-auto w-full min-w-0 max-w-md px-4 py-8">
          <h1 className="mb-2 text-lg font-medium text-zinc-100">クラウド同期（管理者専用）</h1>
          <p className="text-zinc-400">
            この機能は管理者 PIN を入力した端末でのみ利用できます。メモ編集画面の「管理者モードを開く」から
            PIN を入力してください。
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-teal-300 underline">
            メモ画面に戻る
          </Link>
        </main>
      </div>
    );
  }

  const onSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const auth = getFirebaseAuth();
    void signInWithEmailAndPassword(auth, email.trim(), password)
      .then(() => router.replace("/notes"))
      .catch((err: unknown) => {
        setFormError(formatAuthError(err, "ログインに失敗しました。"));
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
      <AppHeader
        showPortalLink
        end={
          <Link href="/" className="rounded-md px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-900/50">
            ホーム
          </Link>
        }
      />
      <main className="mx-auto w-full min-w-0 max-w-md px-4 pb-16 pt-6">
        <h1 className="mb-2 text-lg font-medium text-zinc-100">クラウド同期（管理者）</h1>
        <p className="mb-6 text-sm text-zinc-500">
          管理者アカウントでログインすると、メモが Firestore に保存され、他の端末（PC など）からも同じ内容を閲覧・編集できます。
          一般ユーザー向けの登録機能は公開していません。
        </p>
        {formError ? (
          <p className="mb-4 rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-100">{formError}</p>
        ) : null}
        <form className="space-y-4" onSubmit={onSignIn}>
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-xs text-zinc-500">
              メール
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-teal-900/50 bg-teal-950/30 px-3 py-2 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-teal-600/40"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-xs text-zinc-500">
              パスワード
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-teal-900/50 bg-teal-950/30 px-3 py-2 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-teal-600/40"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? "…" : "ログインして同期開始"}
          </button>
        </form>
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/" className="text-teal-300 underline">
            ログアウト状態のままメモ（この端末のみ保存）
          </Link>
        </p>
      </main>
    </div>
  );
}
