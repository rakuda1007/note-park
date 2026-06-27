const KNOWN_BUILD_KEY = "note-park-known-build";

/** ホーム画面に追加した PWA として起動しているか */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
  );
}

export type AppBuildInfo = {
  version: string;
  updatedAt: string;
};

export async function fetchAppBuildInfo(): Promise<AppBuildInfo | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as AppBuildInfo;
    if (!data?.version) return null;
    return data;
  } catch {
    return null;
  }
}

export function getKnownAppBuild(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KNOWN_BUILD_KEY);
}

export function setKnownAppBuild(version: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KNOWN_BUILD_KEY, version);
}

export async function forceAppUpdate(): Promise<void> {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_refresh", String(Date.now()));
  window.location.replace(url.toString());
}

export async function checkForAppUpdate(): Promise<{
  updateAvailable: boolean;
  remote: AppBuildInfo | null;
  known: string | null;
}> {
  const remote = await fetchAppBuildInfo();
  const known = getKnownAppBuild();
  if (!remote) return { updateAvailable: false, remote: null, known };
  if (!known) {
    setKnownAppBuild(remote.version);
    return { updateAvailable: false, remote, known: remote.version };
  }
  return { updateAvailable: remote.version !== known, remote, known };
}
