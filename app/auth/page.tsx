"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import AppHeader from "@/components/AppHeader";
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

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
        <AppHeader
          end={
            <Link href="/" className="text-sm text-teal-200 hover:underline">
              ホーム
            </Link>
          }
        />
        <main className="mx-auto w-full min-w-0 max-w-md px-4 py-8">
          <p className="text-zinc-400">Firebase が未設定のため、ログインは利用できません。</p>
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
      .then(() => router.replace("/notes?filter=unchecked"))
      .catch((err: unknown) => {
        setFormError(formatAuthError(err, "ログインに失敗しました。"));
      })
      .finally(() => setBusy(false));
  };

  const onSignUp = () => {
    setFormError(null);
    if (password.length < 6) {
      setFormError("パスワードは6文字以上にしてください。");
      return;
    }
    setBusy(true);
    const auth = getFirebaseAuth();
    void createUserWithEmailAndPassword(auth, email.trim(), password)
      .then(() => router.replace("/notes?filter=unchecked"))
      .catch((err: unknown) => {
        setFormError(formatAuthError(err, "登録に失敗しました。"));
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
      <AppHeader
        end={
          <Link href="/" className="rounded-md px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-900/50">
            ホーム
          </Link>
        }
      />
      <main className="mx-auto w-full min-w-0 max-w-md px-4 pb-16 pt-6">
        <h1 className="mb-2 text-lg font-medium text-zinc-100">ログイン / 新規登録</h1>
        <p className="mb-6 text-sm text-zinc-500">
          ログインすると Firestore に保存され、他の端末からも同じアカウントで閲覧・編集できます。未登録のときは
          この端末の localStorage のみ使います。
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
              パスワード（6文字以上）
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {busy ? "…" : "ログイン"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-teal-700/60 px-4 py-2 text-sm text-teal-100 hover:bg-teal-900/50 disabled:opacity-50"
              onClick={onSignUp}
            >
              新規登録
            </button>
          </div>
        </form>
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/" className="text-teal-300 underline">
            登録せずにメモ（この端末のみ保存）
          </Link>
        </p>
      </main>
    </div>
  );
}
