import { isFirebaseConfigured } from "@/lib/firebase/client";
import { isAdminModeEnabled } from "@/lib/ads/preferences";

/** 管理者PIN有効かつ Firebase 設定済みのときだけクラウド同期 UI / 認証を使う */
export function isAdminCloudSyncAvailable(): boolean {
  return isFirebaseConfigured() && isAdminModeEnabled();
}

export const ADMIN_MODE_CHANGED_EVENT = "note-park-admin-mode-changed";

export function notifyAdminModeChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_MODE_CHANGED_EVENT));
}
