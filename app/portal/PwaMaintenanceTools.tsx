"use client";

import { useCallback, useEffect, useState } from "react";
import { exportAllLocalNotesBackup } from "@/lib/note/repository";
import {
  checkForAppUpdate,
  fetchAppBuildInfo,
  forceAppUpdate,
  setKnownAppBuild,
} from "@/lib/pwa/app-update";

export default function PwaMaintenanceTools() {
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<"backup" | "update" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [remoteBuild, setRemoteBuild] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    void exportAllLocalNotesBackup()
      .then((json) => {
        const parsed = JSON.parse(json) as { count?: number };
        setNoteCount(typeof parsed.count === "number" ? parsed.count : 0);
      })
      .catch(() => setNoteCount(null));

    void checkForAppUpdate().then((result) => {
      setRemoteBuild(result.remote?.version ?? null);
      setUpdateAvailable(result.updateAvailable);
    });
  }, []);

  const onBackup = useCallback(async () => {
    setBusy("backup");
    setMessage(null);
    try {
      const json = await exportAllLocalNotesBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `note-park-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const parsed = JSON.parse(json) as { count?: number };
      setMessage(`${parsed.count ?? 0} 件のメモをバックアップしました。`);
    } catch {
      setMessage("バックアップに失敗しました。もう一度お試しください。");
    } finally {
      setBusy(null);
    }
  }, []);

  const onForceUpdate = useCallback(async () => {
    setBusy("update");
    setMessage(null);
    try {
      const remote = await fetchAppBuildInfo();
      if (remote?.version) setKnownAppBuild(remote.version);
      await forceAppUpdate();
    } catch {
      setMessage("更新の開始に失敗しました。アプリを一度終了して開き直してください。");
      setBusy(null);
    }
  }, []);

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 shadow-sm ring-1 ring-amber-500/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">
        ホーム画面アプリのメンテナンス
      </p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
        メモを残したまま最新版へ更新
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        ホーム画面アプリでは「新しいバージョンがあります」が出ないことがあります。削除せずに更新するには、
        先にバックアップを取ってから「最新版を読み込む」を押してください。
        {noteCount !== null ? (
          <span className="mt-1 block text-slate-500">この端末のメモ: {noteCount} 件</span>
        ) : null}
        {remoteBuild ? (
          <span className="mt-1 block text-xs text-slate-500">サーバー版: {remoteBuild}</span>
        ) : null}
        {updateAvailable ? (
          <span className="mt-2 block font-medium text-amber-800">新しい版が利用可能です。</span>
        ) : null}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onBackup()}
          className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-50"
        >
          {busy === "backup" ? "書き出し中…" : "メモをバックアップ（JSON）"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onForceUpdate()}
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {busy === "update" ? "更新中…" : "最新版を読み込む"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        バックアップはこの端末のブラウザ内メモのみです。PCでクラウド同期済みのメモは、ログイン後に別途同期されます。
      </p>
    </div>
  );
}
