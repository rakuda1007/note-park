"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSavedLicenseKey,
  isAdFreeUser,
  saveLicenseKey,
  setAdFreeUser,
  verifyLicenseKeyLocally,
} from "@/lib/purchase/client";
import {
  getAdsDisplayStatusLabel,
  getAdSenseClientId,
  getAdSenseEditorSize,
  getAdSenseEditorSlot,
  initAdsPreferences,
  isAdminModeEnabled,
  isAdSenseConfigured,
  isAdsEnabledByEnv,
  isAdsForceHiddenByEnv,
  isAdsHiddenByUser,
  isAdSettingsEnabledForCurrentUser,
  isIosStandalonePwa,
  setAdminModeEnabled,
  setAdsHiddenByUser,
  shouldDisableAdsInIosPwa,
  verifyAdminPin,
} from "@/lib/ads/preferences";
import { setUserProperties, trackEvent } from "@/lib/analytics/gtag";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdBanner() {
  const [ready, setReady] = useState(false);
  const [adFree, setAdFree] = useState(false);
  const [hiddenByUser, setHiddenByUser] = useState(false);
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [noFillDetected, setNoFillDetected] = useState(false);
  const [iosPwaBlocked, setIosPwaBlocked] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseMessage, setLicenseMessage] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const adRequestedRef = useRef(false);
  const adInsRef = useRef<HTMLModElement | null>(null);
  const lastTrackedStatusRef = useRef<string | null>(null);

  const forceHidden = useMemo(() => isAdsForceHiddenByEnv(), []);
  const adsEnabled = useMemo(() => isAdsEnabledByEnv(), []);
  const adSenseConfigured = useMemo(() => isAdSenseConfigured(), []);
  const adClient = useMemo(() => getAdSenseClientId(), []);
  const adSlot = useMemo(() => getAdSenseEditorSlot(), []);
  const adSize = useMemo(() => getAdSenseEditorSize(), []);
  const disableAdsInIosPwa = useMemo(() => shouldDisableAdsInIosPwa(), []);

  useEffect(() => {
    initAdsPreferences();
    setAdFree(isAdFreeUser());
    setLicenseKey(getSavedLicenseKey());
    setHiddenByUser(isAdsHiddenByUser());
    setSettingsEnabled(isAdSettingsEnabledForCurrentUser());
    if (isAdminModeEnabled()) {
      setAdminMessage("この端末で管理者モードが有効です。");
    }
    setIosPwaBlocked(disableAdsInIosPwa && isIosStandalonePwa());
    setReady(true);
  }, [disableAdsInIosPwa]);

  const shouldShowAds = adsEnabled && !adFree && !forceHidden && !hiddenByUser && !iosPwaBlocked;
  const canControlVisibility = settingsEnabled;
  const displayStatus = !adsEnabled
    ? "disabled_by_env"
    : adFree
      ? "hidden_by_purchase"
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

  useEffect(() => {
    if (!ready) return;
    if (lastTrackedStatusRef.current === displayStatus) return;
    lastTrackedStatusRef.current = displayStatus;

    setUserProperties({
      ad_status: displayStatus,
      ad_free_user: adFree ? "yes" : "no",
    });
    trackEvent("ad_status_updated", {
      ad_status: displayStatus,
      ad_free_user: adFree,
      ads_enabled: adsEnabled,
      ad_sense_configured: adSenseConfigured,
      ios_pwa_blocked: iosPwaBlocked,
    });
  }, [adFree, adSenseConfigured, adsEnabled, displayStatus, iosPwaBlocked, ready]);

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
          <div className="mt-2">
            <button
              type="button"
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setAdminModeEnabled(false);
                setSettingsEnabled(false);
                setAdminMessage("管理者モードを解除しました。");
              }}
            >
              管理者モードを解除
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-teal-700/50 px-2 py-1 text-xs text-teal-200 hover:bg-teal-900/40"
              onClick={() => setBuyOpen((v) => !v)}
            >
              {adFree ? "購入状態を再確認" : "買い切りで広告を非表示"}
            </button>
            {adFree ? <span className="text-teal-300">購入済み（この端末）</span> : null}
          </div>
          {buyOpen ? (
            <div className="mt-2 space-y-2 rounded-md border border-zinc-700/70 bg-zinc-900/70 p-2">
              <p className="text-zinc-400">購入時のライセンスキーを入力してください。</p>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-teal-600"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="ライセンスキー"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={licenseBusy}
                  className="rounded-md bg-teal-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                  onClick={() => {
                    setLicenseBusy(true);
                    setLicenseMessage(null);
                    void verifyLicenseKeyLocally(licenseKey)
                      .then((result) => {
                        setLicenseMessage(result.message);
                        if (result.ok) {
                          saveLicenseKey(licenseKey);
                          setAdFreeUser(true);
                          setAdFree(true);
                          setHiddenByUser(false);
                          setAdsHiddenByUser(false);
                        }
                      })
                      .finally(() => setLicenseBusy(false));
                  }}
                >
                  {licenseBusy ? "確認中…" : "購入状態を確認"}
                </button>
                {adFree ? (
                  <button
                    type="button"
                    className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      setAdFreeUser(false);
                      setAdFree(false);
                      setLicenseMessage("この端末の購入状態を解除しました。");
                    }}
                  >
                    この端末の購入状態を解除
                  </button>
                ) : null}
              </div>
              {licenseMessage ? <p className="text-xs text-zinc-300">{licenseMessage}</p> : null}
              <p className="text-[11px] text-zinc-500">
                注: 現在は静的ホスティング運用のためローカル検証です。次フェーズで API 検証へ移行します。
              </p>
            </div>
          ) : null}
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
          <div className="mt-2">
            <button
              type="button"
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => setAdminOpen((v) => !v)}
            >
              管理者モードを開く
            </button>
            {adminOpen ? (
              <div className="mt-2 space-y-2 rounded-md border border-zinc-700/70 bg-zinc-900/70 p-2">
                <p className="text-zinc-400">PINを入力すると、この端末で広告設定を変更できます。</p>
                <input
                  type="password"
                  className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-teal-600"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="管理者PIN"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={adminBusy}
                    className="rounded-md bg-teal-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                    onClick={() => {
                      setAdminBusy(true);
                      setAdminMessage(null);
                      void verifyAdminPin(adminPin)
                        .then((result) => {
                          setAdminMessage(result.message);
                          if (!result.ok) return;
                          setAdminModeEnabled(true);
                          setSettingsEnabled(true);
                          setAdminPin("");
                        })
                        .finally(() => setAdminBusy(false));
                    }}
                  >
                    {adminBusy ? "確認中…" : "管理者モードを有効化"}
                  </button>
                </div>
                {adminMessage ? <p className="text-xs text-zinc-300">{adminMessage}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

