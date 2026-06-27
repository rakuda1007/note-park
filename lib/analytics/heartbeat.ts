"use client";

import { signInAnonymously } from "firebase/auth";
import {
  doc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getStatsAuth, getStatsFirestore } from "@/lib/analytics/stats-firebase";
import { isFirebaseConfigured } from "@/lib/firebase/client";

const HEARTBEAT_DAY_KEY = "note-park-heartbeat-day";
const HEARTBEAT_OPT_OUT_KEY = "note-park-heartbeat-opt-out";

export type UsagePlatform = "web" | "pwa";

let heartbeatInFlight: Promise<void> | null = null;

export function isHeartbeatOptedOut(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(HEARTBEAT_OPT_OUT_KEY) === "1";
}

export function setHeartbeatOptOut(optOut: boolean): void {
  if (typeof window === "undefined") return;
  if (optOut) {
    window.localStorage.setItem(HEARTBEAT_OPT_OUT_KEY, "1");
  } else {
    window.localStorage.removeItem(HEARTBEAT_OPT_OUT_KEY);
  }
}

/** UTC の YYYY-MM-DD */
export function formatUsageDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function detectUsagePlatform(): UsagePlatform {
  if (typeof window === "undefined") return "web";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone ? "pwa" : "web";
}

function alreadySentToday(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(HEARTBEAT_DAY_KEY) === formatUsageDay(new Date());
}

function markSentToday(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HEARTBEAT_DAY_KEY, formatUsageDay(new Date()));
}

/**
 * 1日1回、匿名の利用統計を Firestore に送る。メモ内容は含めない。
 * 失敗しても呼び出し元へ例外を伝播しない。
 */
export function sendDailyHeartbeat(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!isFirebaseConfigured() || isHeartbeatOptedOut() || alreadySentToday()) {
    return Promise.resolve();
  }
  if (heartbeatInFlight) return heartbeatInFlight;

  heartbeatInFlight = runDailyHeartbeat()
    .then(() => {
      markSentToday();
    })
    .catch((err: unknown) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[note-park] heartbeat failed", err);
      }
    })
    .finally(() => {
      heartbeatInFlight = null;
    });

  return heartbeatInFlight;
}

async function runDailyHeartbeat(): Promise<void> {
  const auth = getStatsAuth();
  const db = getStatsFirestore();
  if (!auth || !db) return;

  const credential = auth.currentUser ?? (await signInAnonymously(auth)).user;
  const today = formatUsageDay(new Date());
  const platform = detectUsagePlatform();
  const dailyRef = doc(db, "usage_daily", today);
  const presenceRef = doc(db, "usage_presence", credential.uid);

  await runTransaction(db, async (tx) => {
    const dailySnap = await tx.get(dailyRef);
    const nextSessions = dailySnap.exists()
      ? Number(dailySnap.data().sessions ?? 0) + 1
      : 1;

    if (!dailySnap.exists()) {
      tx.set(dailyRef, {
        sessions: 1,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.update(dailyRef, {
        sessions: nextSessions,
        updatedAt: serverTimestamp(),
      });
    }

    tx.set(
      presenceRef,
      {
        lastDay: today,
        platform,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

/** 開発者向け: presence の updatedAt を number に正規化 */
export function usageTimestampToMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}
