const ADS_HIDDEN_KEY = "note-park-ads-hidden";
const ADS_SETTINGS_ENABLED_KEY = "note-park-ads-settings-enabled";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function isAdsEnabledByEnv(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED !== "0";
}

export function isAdsForceHiddenByEnv(): boolean {
  return process.env.NEXT_PUBLIC_ADS_FORCE_HIDE === "1";
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

export function isAdSettingsUnlockedByQuery(): boolean {
  if (!isClient()) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("adsettings") === "1";
}

export function isAdSettingsEnabledForCurrentUser(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!isClient()) return false;
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

