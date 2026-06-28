"use client";

import { useEffect, useRef, useState } from "react";
import {
  checkForAppUpdate,
  fetchAppBuildInfo,
  forceAppUpdate,
  setKnownAppBuild,
} from "@/lib/pwa/app-update";

const SKIP_WAITING_MSG = { type: "SKIP_WAITING" as const };

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateReason, setUpdateReason] = useState<"sw" | "version" | null>(null);
  const pendingReloadRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const runVersionCheck = async () => {
    const result = await checkForAppUpdate();
    if (result.updateAvailable) {
      setUpdateAvailable(true);
      setUpdateReason("version");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      void runVersionCheck();
      return;
    }

    const onControllerChange = () => {
      if (!pendingReloadRef.current) return;
      pendingReloadRef.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let removeVisibility: (() => void) | undefined;
    let removeFocus: (() => void) | undefined;

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registrationRef.current = reg;

        const markIfWaiting = () => {
          if (reg.waiting) {
            setUpdateAvailable(true);
            setUpdateReason("sw");
          }
        };
        markIfWaiting();

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
              setUpdateReason("sw");
            }
          });
        });

        const checkForUpdate = () => {
          void reg.update().then(() => {
            if (reg.waiting) {
              setUpdateAvailable(true);
              setUpdateReason("sw");
            }
          });
          void runVersionCheck();
        };

        checkForUpdate();

        const onVisible = () => {
          if (document.visibilityState === "visible") checkForUpdate();
        };
        document.addEventListener("visibilitychange", onVisible);
        removeVisibility = () =>
          document.removeEventListener("visibilitychange", onVisible);

        window.addEventListener("focus", checkForUpdate);
        removeFocus = () => window.removeEventListener("focus", checkForUpdate);
      })
      .catch(() => {
        void runVersionCheck();
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      removeVisibility?.();
      removeFocus?.();
    };
  }, []);

  const applyUpdate = async () => {
    const reg = registrationRef.current;
    if (reg?.waiting) {
      pendingReloadRef.current = true;
      reg.waiting.postMessage(SKIP_WAITING_MSG);
      return;
    }
    const remote = await fetchAppBuildInfo();
    if (remote?.version) setKnownAppBuild(remote.version);
    await forceAppUpdate();
  };

  const dismiss = () => setUpdateAvailable(false);

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-teal-800/60 bg-zinc-950/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-zinc-200">
          {updateReason === "version"
            ? "新しい版が公開されています。更新すると最新の機能が反映されます。"
            : "新しいバージョンがあります。更新すると最新の機能が反映されます。"}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/80"
          >
            あとで
          </button>
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-500"
          >
            更新する
          </button>
        </div>
      </div>
    </div>
  );
}
