"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { getLocalOwnerId, migrateLocalNotesToFirebase } from "@/lib/note/repository";

export type NoteAuthState =
  | { status: "loading"; ownerId: null; isCloud: boolean; userEmail: null; message: null }
  | { status: "migrating"; ownerId: null; isCloud: boolean; userEmail: null; message: null }
  | { status: "ready"; ownerId: string; isCloud: boolean; userEmail: string | null; message: null }
  | { status: "error"; ownerId: null; isCloud: boolean; userEmail: null; message: string };

const defaultNotConfigured: NoteAuthState = {
  status: "ready",
  ownerId: getLocalOwnerId(),
  isCloud: false,
  userEmail: null,
  message: null,
};

const initialConfigured: NoteAuthState = {
  status: "loading",
  ownerId: null,
  isCloud: true,
  userEmail: null,
  message: null,
};

const NoteAuthStateContext = createContext<NoteAuthState | null>(null);

export function NoteAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NoteAuthState>(() =>
    isFirebaseConfigured() ? initialConfigured : defaultNotConfigured,
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({
        status: "ready",
        ownerId: getLocalOwnerId(),
        isCloud: false,
        userEmail: null,
        message: null,
      });
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(
        auth,
        (user: User | null) => {
          if (cancelled) return;
          if (user) {
            setState({ status: "migrating", ownerId: null, isCloud: true, userEmail: null, message: null });
            void (async () => {
              try {
                await migrateLocalNotesToFirebase(user.uid);
                if (cancelled) return;
                setState({
                  status: "ready",
                  ownerId: user.uid,
                  isCloud: true,
                  userEmail: user.email ?? null,
                  message: null,
                });
              } catch (err: unknown) {
                try {
                  await signOut(auth);
                } catch {
                  /* ignore */
                }
                if (!cancelled) {
                  const message =
                    err instanceof Error ? err.message : "ローカルデータの同期に失敗しました。";
                  window.alert(
                    `同期に失敗したためログアウトしました。端末内のメモはそのままです。\n${message}`,
                  );
                }
              }
            })();
          } else {
            setState({
              status: "ready",
              ownerId: getLocalOwnerId(),
              isCloud: false,
              userEmail: null,
              message: null,
            });
          }
        },
        (err) => {
          if (!cancelled) {
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
      unsub?.();
    };
  }, []);

  return <NoteAuthStateContext.Provider value={state}>{children}</NoteAuthStateContext.Provider>;
}

export function useNoteAuth(): NoteAuthState {
  const ctx = useContext(NoteAuthStateContext);
  if (ctx === null) {
    // Provider 外では例外にせず、ヘッダーにログイン導線を出せるようにする
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
