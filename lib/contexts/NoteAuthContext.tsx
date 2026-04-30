"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { getLocalOwnerId, migrateLocalNotesToFirebase } from "@/lib/note/repository";

const AUTH_TOKEN_TIMEOUT_MS = 25_000;
/** onAuthStateChanged の初回コールバックが来ない／極端に遅い環境向け */
const AUTH_INIT_WATCHDOG_MS = 60_000;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

export type NoteAuthState =
  | { status: "loading"; ownerId: null; isCloud: boolean; userEmail: null; message: null }
  | { status: "migrating"; ownerId: null; isCloud: boolean; userEmail: null; message: null }
  | {
      status: "ready";
      ownerId: string;
      isCloud: boolean;
      userEmail: string | null;
      message: null;
      /** 未ログイン時 localStorage → Firestore 移行に失敗した場合（ログインは継続。再同期可） */
      migrationError: string | null;
    }
  | { status: "error"; ownerId: null; isCloud: boolean; userEmail: null; message: string };

function formatMigrationError(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === "permission-denied") {
      return "Firestore への保存が拒否されました。Firebase コンソールのセキュリティルール、または同じ Google アカウントでログインできているか確認してください。";
    }
    if (err.code === "unavailable" || err.code === "deadline-exceeded" || err.code === "aborted") {
      return "ネットワークが不安定、または一時的に接続できません。通信のよい場所で「もう一度同期」をお試しください。";
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "ローカルメモの同期に失敗しました。";
}

const defaultNotConfigured: NoteAuthState = {
  status: "ready",
  ownerId: getLocalOwnerId(),
  isCloud: false,
  userEmail: null,
  message: null,
  migrationError: null,
};

const initialConfigured: NoteAuthState = {
  status: "loading",
  ownerId: null,
  isCloud: true,
  userEmail: null,
  message: null,
};

const NoteAuthStateContext = createContext<NoteAuthState | null>(null);

const NoteAuthApiContext = createContext<{
  retryLocalMigration: () => Promise<void>;
} | null>(null);

export function NoteAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NoteAuthState>(() =>
    isFirebaseConfigured() ? initialConfigured : defaultNotConfigured,
  );

  const runMigrationRef = useRef<((user: User) => Promise<void>) | null>(null);

  const retryLocalMigration = useCallback(async () => {
    const u = getFirebaseAuth().currentUser;
    if (!u) return;
    await runMigrationRef.current?.(u);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({
        status: "ready",
        ownerId: getLocalOwnerId(),
        isCloud: false,
        userEmail: null,
        message: null,
        migrationError: null,
      });
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    const watchdogId = window.setTimeout(() => {
      if (cancelled) return;
      setState((prev) => {
        if (prev.status !== "loading") return prev;
        return {
          status: "error",
          ownerId: null,
          isCloud: true,
          userEmail: null,
          message:
            "認証の準備が制限時間内に終わりませんでした。ネットワークと Firebase 設定を確認のうえ、ページを再読み込みしてください。",
        };
      });
    }, AUTH_INIT_WATCHDOG_MS);

    const run = async (user: User) => {
      setState({
        status: "migrating",
        ownerId: null,
        isCloud: true,
        userEmail: null,
        message: null,
      });
      try {
        await withTimeout(
          user.getIdToken(true),
          AUTH_TOKEN_TIMEOUT_MS,
          `ログイン確認が ${AUTH_TOKEN_TIMEOUT_MS / 1000} 秒以内に完了しませんでした。通信を確認し、ページを再読み込みしてください。`,
        );
        await migrateLocalNotesToFirebase(user.uid);
        if (cancelled) return;
        setState({
          status: "ready",
          ownerId: user.uid,
          isCloud: true,
          userEmail: user.email ?? null,
          message: null,
          migrationError: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "ready",
          ownerId: user.uid,
          isCloud: true,
          userEmail: user.email ?? null,
          message: null,
          migrationError: formatMigrationError(err),
        });
      }
    };

    runMigrationRef.current = run;

    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(
        auth,
        (user: User | null) => {
          if (cancelled) return;
          window.clearTimeout(watchdogId);
          if (user) {
            void run(user);
          } else {
            setState({
              status: "ready",
              ownerId: getLocalOwnerId(),
              isCloud: false,
              userEmail: null,
              message: null,
              migrationError: null,
            });
          }
        },
        (err) => {
          if (!cancelled) {
            window.clearTimeout(watchdogId);
            setState({
              status: "error",
              ownerId: null,
              isCloud: true,
              userEmail: null,
              message: err.message ?? "認証に失敗しました。",
            });
          }
        },
      );
    } catch (err: unknown) {
      window.clearTimeout(watchdogId);
      const message =
        err instanceof Error
          ? err.message
          : "Firebase の初期化に失敗しました。環境変数（NEXT_PUBLIC_FIREBASE_*）を確認してください。";
      setState({
        status: "error",
        ownerId: null,
        isCloud: true,
        userEmail: null,
        message,
      });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(watchdogId);
      runMigrationRef.current = null;
      unsub?.();
    };
  }, []);

  return (
    <NoteAuthStateContext.Provider value={state}>
      <NoteAuthApiContext.Provider value={{ retryLocalMigration }}>{children}</NoteAuthApiContext.Provider>
    </NoteAuthStateContext.Provider>
  );
}

export function useNoteAuth(): NoteAuthState {
  const ctx = useContext(NoteAuthStateContext);
  if (ctx === null) {
    return {
      status: "error",
      ownerId: null,
      isCloud: true,
      userEmail: null,
      message: "認証の初期化に失敗しました。ページを再読み込みしてください。",
    };
  }
  return ctx;
}

export function useLocalMigrationRetry() {
  const ctx = useContext(NoteAuthApiContext);
  if (!ctx) {
    return { retryLocalMigration: async () => {} };
  }
  return ctx;
}
