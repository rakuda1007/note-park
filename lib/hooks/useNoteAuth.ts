"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { getLocalOwnerId } from "@/lib/note/repository";

export type NoteAuthState =
  | { status: "loading"; ownerId: null; isCloud: boolean }
  | { status: "ready"; ownerId: string; isCloud: boolean }
  | { status: "error"; ownerId: null; isCloud: boolean; message: string };

export function useNoteAuth(): NoteAuthState {
  const [state, setState] = useState<NoteAuthState>(() =>
    isFirebaseConfigured()
      ? { status: "loading", ownerId: null, isCloud: true }
      : { status: "ready", ownerId: getLocalOwnerId(), isCloud: false },
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({ status: "ready", ownerId: getLocalOwnerId(), isCloud: false });
      return;
    }

    const auth = getFirebaseAuth();
    let cancelled = false;

    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (cancelled) return;
        if (user) {
          setState({ status: "ready", ownerId: user.uid, isCloud: true });
          return;
        }
        void signInAnonymously(auth).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "匿名ログインに失敗しました";
          setState({ status: "error", ownerId: null, isCloud: true, message });
        });
      },
      (err) => {
        setState({
          status: "error",
          ownerId: null,
          isCloud: true,
          message: err.message ?? "認証エラー",
        });
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
