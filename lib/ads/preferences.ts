const ADS_HIDDEN_KEY = "note-park-ads-hidden";
const ADS_SETTINGS_ENABLED_KEY = "note-park-ads-settings-enabled";
const ADS_PREFS_VERSION_KEY = "note-park-ads-prefs-version";
const ADS_PREFS_VERSION = "1";
const ADMIN_MODE_KEY = "note-park-admin-mode-enabled";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function isAdsEnabledByEnv(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED !== "0";
}

export function isAdsForceHiddenByEnv(): boolean {
  return process.env.NEXT_PUBLIC_ADS_FORCE_HIDE === "1";
}

export function shouldDisableAdsInIosPwa(): boolean {
  // 既定は表示（必要な場合のみ環境変数で無効化）
  return process.env.NEXT_PUBLIC_ADS_DISABLE_IOS_PWA === "1";
}

export function getAdSenseClientId(): string {
  return (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "").trim();
}

export function getAdSenseEditorSlot(): string {
  return (process.env.NEXT_PUBLIC_ADSENSE_SLOT_EDITOR ?? "").trim();
}

export function isAdSenseConfigured(): boolean {
  return getAdSenseClientId().length > 0 && getAdSenseEditorSlot().length > 0;
}

export type AdSenseSize = { width: number; height: number; label: "320x100" | "300x250" };

export function getAdSenseEditorSize(): AdSenseSize {
  const raw = (process.env.NEXT_PUBLIC_ADSENSE_EDITOR_SIZE ?? "").trim();
  if (raw === "300x250") {
    return { width: 300, height: 250, label: "300x250" };
  }
  return { width: 320, height: 100, label: "320x100" };
}

export function isIosStandalonePwa(): boolean {
  if (!isClient()) return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standaloneByNavigator = nav.standalone === true;
  const standaloneByMedia = window.matchMedia("(display-mode: standalone)").matches;
  const isiOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  return isiOS && (standaloneByNavigator || standaloneByMedia);
}

export function isAdSettingsUnlockedByQuery(): boolean {
  if (!isClient()) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("adsettings") === "1";
}

export function isAdminModeEnabled(): boolean {
  if (!isClient()) return false;
  return window.localStorage.getItem(ADMIN_MODE_KEY) === "1";
}

export function setAdminModeEnabled(enabled: boolean): void {
  if (!isClient()) return;
  window.localStorage.setItem(ADMIN_MODE_KEY, enabled ? "1" : "0");
}

function readAdminPinSha256FromDom(): string | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector('meta[name="note-park-admin-pin-sha256"]');
  const raw = el?.getAttribute("content");
  if (raw == null) return null;
  const v = raw.replace(/^\uFEFF/, "").trim().toLowerCase();
  return v;
}

/**
 * ビルド時に layout の meta に埋め込んだ値を優先する。
 * 一部チャンクで NEXT_PUBLIC_* の置換が空になる場合の回避。
 */
function getAdminPinSha256(): string {
  const fromDom = readAdminPinSha256FromDom();
  if (fromDom !== null && fromDom.length > 0) return fromDom;
  return (process.env.NEXT_PUBLIC_ADMIN_PIN_SHA256 ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminPin(pin: string): Promise<{ ok: boolean; message: string }> {
  const normalized = pin.trim();
  if (!normalized) {
    return { ok: false, message: "PINを入力してください。" };
  }
  const expected = getAdminPinSha256();
  if (!expected) {
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]");
    const hint = isLocalHost
      ? "GitHub の Repository secrets はローカルのブラウザには届きません。この PC では .env.local に NEXT_PUBLIC_ADMIN_PIN_SHA256 を書き、npm run dev（または next build に渡す env）をやり直してください。"
      : "本番サイトでは、GitHub Actions の「npm run build」に NEXT_PUBLIC_ADMIN_PIN_SHA256 が渡ったビルドで再デプロイされている必要があります。Secret 登録後に main へプッシュしたか、Actions のログでビルドが成功しているか確認してください。";
    return {
      ok: false,
      message: `管理者PIN用の NEXT_PUBLIC_ADMIN_PIN_SHA256 がこのビルドに含まれていません（空です）。${hint}`,
    };
  }
  const actual = await sha256Hex(normalized);
  if (actual !== expected) {
    return { ok: false, message: "PINが一致しません。" };
  }
  return { ok: true, message: "管理者モードを有効化しました。" };
}

export function isAdSettingsEnabledForCurrentUser(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!isClient()) return false;
  if (isAdminModeEnabled()) {
    window.localStorage.setItem(ADS_SETTINGS_ENABLED_KEY, "1");
    return true;
  }
  if (isAdSettingsUnlockedByQuery()) {
    window.localStorage.setItem(ADS_SETTINGS_ENABLED_KEY, "1");
    return true;
  }
  return window.localStorage.getItem(ADS_SETTINGS_ENABLED_KEY) === "1";
}

export function isAdsHiddenByUser(): boolean {
  if (!isClient()) return false;
  return window.localStorage.getItem(ADS_HIDDEN_KEY) === "1";
}

export function setAdsHiddenByUser(hidden: boolean): void {
  if (!isClient()) return;
  window.localStorage.setItem(ADS_HIDDEN_KEY, hidden ? "1" : "0");
}

export function initAdsPreferences(): void {
  if (!isClient()) return;
  const current = window.localStorage.getItem(ADS_PREFS_VERSION_KEY);
  if (current === ADS_PREFS_VERSION) return;

  // 将来のキー変更に備えて初期化処理を一箇所に集約
  const hiddenRaw = window.localStorage.getItem(ADS_HIDDEN_KEY);
  if (hiddenRaw !== "1" && hiddenRaw !== "0") {
    window.localStorage.setItem(ADS_HIDDEN_KEY, "0");
  }
  window.localStorage.setItem(ADS_PREFS_VERSION_KEY, ADS_PREFS_VERSION);
}

export type AdsDisplayStatus =
  | "hidden_by_env"
  | "hidden_by_ios_pwa"
  | "hidden_by_purchase"
  | "hidden_by_user"
  | "disabled_by_env"
  | "visible";

export function getAdsDisplayStatusLabel(status: AdsDisplayStatus): string {
  switch (status) {
    case "hidden_by_env":
      return "環境設定で常に非表示";
    case "hidden_by_ios_pwa":
      return "iOSホーム画面アプリでは非表示";
    case "hidden_by_purchase":
      return "購入状態により非表示";
    case "hidden_by_user":
      return "ユーザー設定で非表示";
    case "disabled_by_env":
      return "環境設定で広告機能オフ";
    case "visible":
    default:
      return "表示対象";
  }
}

