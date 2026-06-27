"use client";

import { useCallback, useEffect, useState } from "react";
import { exportAllLocalNotesBackup } from "@/lib/note/repository";
import {
  checkForAppUpdate,
  fetchAppBuildInfo,
  forceAppUpdate,
  isStandalonePwa,
  setKnownAppBuild,
} from "@/lib/pwa/app-update";

export default function PwaMaintenanceTools() {
  const [visible, setVisible] = useState(false);
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<"backup" | "update" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa()) return;
    setVisible(true);

    void exportAllLocalNotesBackup()
      .then((json) => {
        const parsed = JSON.parse(json) as { count?: number };
        setNoteCount(typeof parsed.count === "number" ? parsed.count : 0);
      })
      .catch(() => setNoteCount(null));

    void checkForAppUpdate().then((result) => {
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
      setMessage(`${parsed.count ?? 0} 件のメモをファイルに保存しました。`);
    } catch {
      setMessage("保存に失敗しました。もう一度お試しください。");
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
      setMessage("更新を開始できませんでした。アプリを一度終了して開き直してください。");
      setBusy(null);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
        アプリを最新の状態にする
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        ホーム画面から開いている場合、更新のお知らせが届かないことがあります。必要なときは、メモをファイルに保存してから「最新版を読み込む」を押してください。
        {noteCount !== null ? (
          <span className="mt-1 block text-slate-500">この端末のメモ: {noteCount} 件</span>
        ) : null}
        {updateAvailable ? (
          <span className="mt-2 block font-medium text-sky-700">新しい版があります。</span>
        ) : null}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onBackup()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "backup" ? "保存中…" : "メモをファイルに保存"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onForceUpdate()}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy === "update" ? "読み込み中…" : "最新版を読み込む"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        保存したファイルは、この端末のメモの控えです。
      </p>
    </div>
  );
}
