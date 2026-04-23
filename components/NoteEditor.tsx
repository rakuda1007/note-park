"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AuthToolbar from "@/components/AuthToolbar";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";
import {
  createNote,
  deleteNote,
  fetchNote,
  updateNote,
} from "@/lib/note/repository";
import type { NoteLine } from "@/lib/types/note";

type InternalLine = { id: string; text: string; checked: boolean };

function newEmptyLine(): InternalLine {
  return { id: crypto.randomUUID(), text: "", checked: false };
}

function linesFromPayload(rows: NoteLine[]): InternalLine[] {
  if (rows.length === 0) return [newEmptyLine()];
  return rows.map((r) => ({
    id: crypto.randomUUID(),
    text: r.text,
    checked: r.checked,
  }));
}

function toPayload(lines: InternalLine[], title: string) {
  return {
    title: title.trim(),
    lines: lines.map(({ text, checked }) => ({ text, checked })),
  };
}

function hasMeaningfulContent(lines: InternalLine[], title: string): boolean {
  if (title.trim().length > 0) return true;
  return lines.some((l) => l.text.trim().length > 0 || l.checked);
}

const AUTOSAVE_MS = 1200;

type Props = {
  mode: "new" | "edit";
  initialNoteId?: string;
};

export default function NoteEditor({ mode, initialNoteId }: Props) {
  const router = useRouter();
  const auth = useNoteAuth();
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<InternalLine[]>(() => [newEmptyLine()]);
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(mode === "edit");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linesSnapshotRef = useRef(lines);
  const titleRef = useRef(title);
  const remoteIdRef = useRef(remoteId);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  linesSnapshotRef.current = lines;
  titleRef.current = title;
  remoteIdRef.current = remoteId;

  const ownerId = auth.status === "ready" && auth.ownerId ? auth.ownerId : null;

  const focusLine = useCallback((index: number, caret?: number) => {
    requestAnimationFrame(() => {
      const el = inputRefs.current[index];
      if (!el) return;
      el.focus();
      const pos = caret ?? el.value.length;
      el.setSelectionRange(pos, pos);
    });
  }, []);

  /** 起動直後にメモ入力へフォーカス（認証待ちに依存しない・複数回試行） */
  useEffect(() => {
    if (mode !== "new" || loadingNote) return;
    const run = () => focusLine(0, 0);
    run();
    const t0 = window.setTimeout(run, 0);
    const t1 = window.setTimeout(run, 50);
    const t2 = window.setTimeout(run, 150);
    const t3 = window.setTimeout(run, 400);
    const raf = requestAnimationFrame(() => requestAnimationFrame(run));
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      cancelAnimationFrame(raf);
    };
  }, [mode, loadingNote, focusLine]);

  useEffect(() => {
    if (mode !== "new" || loadingNote) return;
    if (auth.status !== "ready") return;
    focusLine(0, 0);
  }, [auth.status, mode, loadingNote, focusLine]);
  useEffect(() => {
    if (mode !== "new") return;
    setTitle("");
    setLines([newEmptyLine()]);
    setRemoteId(null);
    setLoadError(null);
    setLoadingNote(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !initialNoteId) return;
    if (auth.status !== "ready" || !ownerId) return;

    let cancelled = false;
    setLoadingNote(true);
    setLoadError(null);

    void fetchNote(initialNoteId, ownerId)
      .then((note) => {
        if (cancelled || !note) {
          if (!cancelled && !note) setLoadError("ノートが見つかりませんでした");
          return;
        }
        setRemoteId(note.id);
        setTitle(note.title);
        setLines(linesFromPayload(note.lines));
      })
      .catch(() => {
        if (!cancelled) setLoadError("読み込みに失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoadingNote(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, initialNoteId, auth.status, ownerId]);

  const persist = useCallback(async () => {
    const t = titleRef.current;
    const ls = linesSnapshotRef.current;
    let id = remoteIdRef.current;
    const uid = ownerId;
    if (!uid) return;

    if (!hasMeaningfulContent(ls, t)) {
      if (id) {
        try {
          await deleteNote(id, uid);
        } catch {
          /* ignore */
        }
        setRemoteId(null);
        remoteIdRef.current = null;
        if (mode === "edit") router.replace("/");
      }
      return;
    }

    const payload = toPayload(ls, t);

    try {
      if (!id) {
        id = await createNote(uid, payload);
        setRemoteId(id);
        remoteIdRef.current = id;
      } else {
        await updateNote(id, uid, payload);
      }
    } catch {
      /* ignore network errors; next edit will retry */
    }
  }, [mode, ownerId, router]);

  const schedulePersist = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist();
    }, AUTOSAVE_MS);
  }, [persist]);

  useEffect(() => {
    if (auth.status !== "ready" || !ownerId) return;
    if (mode === "edit" && loadingNote) return;
    schedulePersist();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, lines, auth.status, ownerId, mode, loadingNote, schedulePersist]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void persist();
    };
  }, [persist]);

  const updateLine = useCallback((index: number, patch: Partial<InternalLine>) => {
    setLines((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      next[index] = { ...cur, ...patch };
      return next;
    });
  }, []);

  const insertLineAfter = useCallback(
    (index: number, left: string, right: string) => {
      setLines((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (!cur) return prev;
        next[index] = { ...cur, text: left };
        const insert = { id: crypto.randomUUID(), text: right, checked: false };
        next.splice(index + 1, 0, insert);
        return next;
      });
      queueMicrotask(() => focusLine(index + 1, right.length));
    },
    [focusLine],
  );

  const removeLineAt = useCallback(
    (index: number) => {
      setLines((prev) => {
        if (prev.length <= 1) return prev;
        const caret = prev[index - 1]?.text.length ?? 0;
        const next = prev.filter((_, i) => i !== index);
        const result = next.length === 0 ? [newEmptyLine()] : next;
        queueMicrotask(() => focusLine(index - 1, caret));
        return result;
      });
    },
    [focusLine],
  );

  const mergeWithPrevious = useCallback(
    (index: number) => {
      setLines((prev) => {
        if (index <= 0) return prev;
        const next = [...prev];
        const prevLine = next[index - 1];
        const cur = next[index];
        if (!prevLine || !cur) return prev;
        const merged = prevLine.text + cur.text;
        const mergedChecked = prevLine.checked || cur.checked;
        next[index - 1] = {
          ...prevLine,
          text: merged,
          checked: mergedChecked,
        };
        next.splice(index, 1);
        const result = next.length === 0 ? [newEmptyLine()] : next;
        queueMicrotask(() => focusLine(index - 1, merged.length));
        return result;
      });
    },
    [focusLine],
  );

  const onLineKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      const line = lines[index];
      if (!line) return;
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;

      if (e.key === "Enter") {
        e.preventDefault();
        const left = line.text.slice(0, start);
        const right = line.text.slice(end);
        insertLineAfter(index, left, right);
        return;
      }

      if (e.key === "Backspace") {
        if (start !== 0 || end !== 0) return;
        if (line.text.length === 0) {
          if (lines.length <= 1) return;
          e.preventDefault();
          removeLineAt(index);
          return;
        }
        if (index > 0) {
          e.preventDefault();
          mergeWithPrevious(index);
        }
      }
    },
    [lines, insertLineAfter, removeLineAt, mergeWithPrevious],
  );

  const toggleChecked = useCallback((index: number) => {
    setLines((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      next[index] = { ...cur, checked: !cur.checked };
      return next;
    });
  }, []);

  const statusBanner = useMemo(() => {
    if (auth.status === "loading") {
      return (
        <p className="rounded-md bg-teal-900/40 px-3 py-2 text-sm text-teal-100">準備中…</p>
      );
    }
    if (auth.status === "migrating") {
      return (
        <p className="rounded-md bg-teal-900/40 px-3 py-2 text-sm text-teal-100">
          未ログイン時のメモを同期しています…
        </p>
      );
    }
    if (auth.status === "error") {
      return (
        <p className="rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-100">{auth.message}</p>
      );
    }
    if (auth.isCloud) {
      return (
        <p className="text-xs text-zinc-500">変更は自動保存されます（空にすると保存されません）</p>
      );
    }
    return (
      <p className="text-xs text-amber-200/90">ログイン前はこの端末内（localStorage）のみに保存します</p>
    );
  }, [auth]);

  if (loadError) {
    return (
      <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
        <AppHeader
          end={
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <AuthToolbar />
              <div className="h-4 w-px shrink-0 self-center bg-teal-800/50" aria-hidden="true" />
              <Link href="/notes" title="保存したメモの一覧" className="text-sm text-teal-200 hover:underline">
                メモ一覧
              </Link>
            </div>
          }
        />
        <main className="mx-auto w-full min-w-0 max-w-lg px-4 py-8">
          <p className="text-red-200">{loadError}</p>
          <Link href="/notes" className="mt-4 inline-block text-teal-300 underline">
            一覧に戻る
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
      <AppHeader
        end={
          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2.5">
            <AuthToolbar />
            <div className="h-4 w-px shrink-0 self-center bg-teal-800/50" aria-hidden="true" />
            <Link
              href="/notes"
              title="保存したメモの一覧"
              className="rounded-md px-2 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-900/50 sm:px-3"
            >
              メモ一覧
            </Link>
          </div>
        }
      />
      <main className="mx-auto w-full min-w-0 max-w-lg px-4 pb-16 pt-4">
        {loadingNote ? (
          <p className="text-zinc-400">読み込み中…</p>
        ) : (
          <>
            <div className="space-y-1">
              {lines.map((line, realIndex) => (
                <div
                  key={line.id}
                  className="flex min-w-0 items-start gap-2 rounded-lg border border-transparent px-1 py-0.5 hover:border-teal-800/40 focus-within:border-teal-600/50"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={line.checked}
                    aria-label={line.checked ? "完了を解除" : "完了にする"}
                    title={line.checked ? "完了を解除" : "完了にする"}
                    className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-teal-700/60 bg-teal-950/50 text-lg text-teal-100 hover:bg-teal-900/60"
                    onClick={() => toggleChecked(realIndex)}
                  >
                    {line.checked ? "☑" : "□"}
                  </button>
                  <input
                    ref={(el) => {
                      inputRefs.current[realIndex] = el;
                    }}
                    id={realIndex === 0 ? "note-park-first-line" : undefined}
                    name={realIndex === 0 ? "note" : undefined}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-h-11 min-w-0 flex-1 border-none bg-transparent py-2 text-base text-zinc-100 caret-teal-400 outline-none placeholder:text-zinc-500"
                    placeholder={realIndex === 0 ? "メモを入力…" : ""}
                    value={line.text}
                    autoFocus={mode === "new" && realIndex === 0}
                    enterKeyHint={realIndex === lines.length - 1 ? "enter" : "next"}
                    onChange={(e) => updateLine(realIndex, { text: e.target.value })}
                    onKeyDown={(e) => onLineKeyDown(realIndex, e)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                タイトル（あとから）
              </label>
              <input
                className="w-full min-w-0 rounded-lg border border-teal-900/50 bg-teal-950/30 px-3 py-2 text-base text-zinc-100 outline-none ring-teal-600/40 placeholder:text-zinc-600 focus:ring-2"
                placeholder="無題のノート"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="mt-4">{statusBanner}</div>
          </>
        )}
      </main>
    </div>
  );
}
