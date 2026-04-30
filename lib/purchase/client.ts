const AD_FREE_KEY = "note-park-ad-free";
const AD_FREE_LICENSE_KEY = "note-park-ad-free-license";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function isAdFreeUser(): boolean {
  if (!isClient()) return false;
  return window.localStorage.getItem(AD_FREE_KEY) === "1";
}

export function setAdFreeUser(value: boolean): void {
  if (!isClient()) return;
  window.localStorage.setItem(AD_FREE_KEY, value ? "1" : "0");
}

export function getSavedLicenseKey(): string {
  if (!isClient()) return "";
  return window.localStorage.getItem(AD_FREE_LICENSE_KEY) ?? "";
}

export function saveLicenseKey(value: string): void {
  if (!isClient()) return;
  window.localStorage.setItem(AD_FREE_LICENSE_KEY, value.trim());
}

/**
 * 静的ホスティング運用中の暫定検証。
 * 本番の厳格運用では API 検証へ置き換える前提。
 */
export async function verifyLicenseKeyLocally(key: string): Promise<{ ok: boolean; message: string }> {
  const normalized = key.trim();
  if (!normalized) {
    return { ok: false, message: "ライセンスキーを入力してください。" };
  }
  const demoKey = (process.env.NEXT_PUBLIC_PURCHASE_DEMO_LICENSE ?? "").trim();
  if (!demoKey) {
    return {
      ok: false,
      message: "現在は買い切り検証が未設定です。運営にお問い合わせください。",
    };
  }
  if (normalized !== demoKey) {
    return { ok: false, message: "ライセンスキーが一致しません。" };
  }
  return { ok: true, message: "購入状態を確認しました。広告を非表示にします。" };
}

