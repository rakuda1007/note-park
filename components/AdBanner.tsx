"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAdsDisplayStatusLabel,
  getAdSenseClientId,
  getAdSenseEditorSize,
  getAdSenseEditorSlot,
  initAdsPreferences,
  isAdSenseConfigured,
  isAdsEnabledByEnv,
  isAdsForceHiddenByEnv,
  isAdsHiddenByUser,
  isAdSettingsEnabledForCurrentUser,
  isIosStandalonePwa,
  setAdsHiddenByUser,
  shouldDisableAdsInIosPwa,
} from "@/lib/ads/preferences";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdBanner() {
  const [ready, setReady] = useState(false);
  const [hiddenByUser, setHiddenByUser] = useState(false);
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [noFillDetected, setNoFillDetected] = useState(false);
  const [iosPwaBlocked, setIosPwaBlocked] = useState(false);
  const adRequestedRef = useRef(false);
  const adInsRef = useRef<HTMLModElement | null>(null);

  const forceHidden = useMemo(() => isAdsForceHiddenByEnv(), []);
  const adsEnabled = useMemo(() => isAdsEnabledByEnv(), []);
  const adSenseConfigured = useMemo(() => isAdSenseConfigured(), []);
  const adClient = useMemo(() => getAdSenseClientId(), []);
  const adSlot = useMemo(() => getAdSenseEditorSlot(), []);
  const adSize = useMemo(() => getAdSenseEditorSize(), []);
  const disableAdsInIosPwa = useMemo(() => shouldDisableAdsInIosPwa(), []);

  useEffect(() => {
    initAdsPreferences();
    setHiddenByUser(isAdsHiddenByUser());
    setSettingsEnabled(isAdSettingsEnabledForCurrentUser());
    setIosPwaBlocked(disableAdsInIosPwa && isIosStandalonePwa());
    setReady(true);
  }, [disableAdsInIosPwa]);

  const shouldShowAds = adsEnabled && !forceHidden && !hiddenByUser && !iosPwaBlocked;
  const canControlVisibility = settingsEnabled;
  const displayStatus = !adsEnabled
    ? "disabled_by_env"
    : forceHidden
      ? "hidden_by_env"
      : iosPwaBlocked
        ? "hidden_by_ios_pwa"
        : hiddenByUser
          ? "hidden_by_user"
          : "visible";

  useEffect(() => {
    if (!shouldShowAds || !adSenseConfigured || !scriptReady) return;
    if (!adInsRef.current || adRequestedRef.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      adRequestedRef.current = true;
    } catch {
      // 広告ブロッカー等で push 失敗しても編集画面の利用を妨げない
    }
  }, [adSenseConfigured, scriptReady, shouldShowAds]);

  useEffect(() => {
    if (!shouldShowAds || !scriptReady || !adInsRef.current) return;
    const timer = window.setTimeout(() => {
      const el = adInsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 20) {
        setNoFillDetected(true);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [scriptReady, shouldShowAds]);

  if (!ready) return null;

  return (
    <section className="mt-6 space-y-2">
      {shouldShowAds && adSenseConfigured ? (
        <Script
          id="note-park-adsense-loader"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adClient)}`}
          crossOrigin="anonymous"
          onLoad={() => setScriptReady(true)}
          onError={() => setScriptFailed(true)}
        />
      ) : null}

      {shouldShowAds && !scriptFailed && !noFillDetected ? (
        adSenseConfigured ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2" aria-label="広告エリア">
            <div className="mx-auto w-fit overflow-hidden rounded">
              <ins
                ref={adInsRef}
                className="adsbygoogle"
                style={{
                  display: "inline-block",
                  width: `${adSize.width}px`,
                  height: `${adSize.height}px`,
                }}
                data-ad-client={adClient}
                data-ad-slot={adSlot}
                data-full-width-responsive="false"
              />
            </div>
          </div>
        ) : (
          <div
            className="min-h-[84px] rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400"
            aria-label="広告エリア"
          >
            <p className="mb-1 text-zinc-300">広告</p>
            <p>AdSense の client / slot が未設定のため、広告は表示されません。</p>
          </div>
        )
      ) : null}

      {canControlVisibility ? (
        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
          <p className="mb-1 text-zinc-300">広告設定</p>
          <p className="text-zinc-500">現在の状態: {getAdsDisplayStatusLabel(displayStatus)}</p>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={hiddenByUser}
              onChange={(e) => {
                const next = e.target.checked;
                setHiddenByUser(next);
                setAdsHiddenByUser(next);
              }}
            />
            <span>広告を非表示にする（開発/限定ユーザー設定）</span>
          </label>
          <p className="mt-1 text-zinc-500">広告サイズ: {adSize.label}</p>
          {forceHidden ? <p className="mt-1 text-amber-300">環境設定により広告は常に非表示です。</p> : null}
          {iosPwaBlocked ? (
            <p className="mt-1 text-zinc-500">iOS のホーム画面アプリでは広告を抑止しています。</p>
          ) : null}
          {scriptFailed ? <p className="mt-1 text-zinc-500">広告スクリプトの読み込みに失敗しました。</p> : null}
          {noFillDetected ? <p className="mt-1 text-zinc-500">この環境では広告の配信がありませんでした。</p> : null}
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-500">
          <p className="text-zinc-300">広告設定</p>
          <p className="mt-1">現在の状態: {getAdsDisplayStatusLabel(displayStatus)}</p>
        </div>
      )}
    </section>
  );
}

