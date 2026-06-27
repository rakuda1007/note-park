"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";

const STATS_APP_NAME = "note-park-stats";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

function getStatsApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === STATS_APP_NAME);
  if (existing) return existing;
  return initializeApp(firebaseConfig, STATS_APP_NAME);
}

/** メモ用ログインとは別インスタンス。匿名統計のみに使う。 */
export function getStatsAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  return getAuth(getStatsApp());
}

export function getStatsFirestore(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  return getFirestore(getStatsApp());
}
