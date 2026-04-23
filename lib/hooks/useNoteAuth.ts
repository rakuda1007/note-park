"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { getLocalOwnerId, migrateLocalNotesToFirebase } from "@/lib/note/repository";

export type NoteAuthState =
  | { status: "loading"; ownerId: null; isCloud: boolean; userEmail: null; message: null }
  | { status: "migrating"; ownerId: null; isCloud: boolean; userEmail: null; message: null }
  | { status: "ready"; ownerId: string; isCloud: boolean; userEmail: string | null; message: null }
  | { status: "error"; ownerId: null; isCloud: boolean; userEmail: null; message: string };

export function useNoteAuth(): NoteAuthState {
  const [state, setState] = useState<NoteAuthState>(() =>
    isFirebaseConfigured()
      ? { status: "loading", ownerId: null, isCloud: true, userEmail: null, message: null }
      : { status: "ready", ownerId: getLocalOwnerId(), isCloud: false, userEmail: null, message: null },
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

    const auth = getFirebaseAuth();
    let cancelled = false;

    const unsub = onAuthStateChanged(
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
                window.alert(`同期に失敗したためログアウトしました。端末内のメモはそのままです。\n${message}`);
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

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
