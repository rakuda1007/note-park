"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AuthToolbar from "@/components/AuthToolbar";
import LocalMigrationErrorBanner from "@/components/LocalMigrationErrorBanner";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";
import { deleteNote, listNotes, updateNote } from "@/lib/note/repository";
import type { NoteLine, NoteListItem } from "@/lib/types/note";

type LineFilter = "all" | "checked" | "unchecked";
/** URL に filter が無いとき。初期表示は未チェックを優先する */
const DEFAULT_LINE_FILTER: LineFilter = "unchecked";

const LIST_FETCH_TIMEOUT_MS = 30_000;

function parseLineFilter(requested: string | null): LineFilter {
  if (requested === "all" || requested === "checked" || requested === "unchecked") {
    return requested;
  }
  return DEFAULT_LINE_FILTER;
}

function readFilterFromLocation(): LineFilter {
  if (typeof window === "undefined") return DEFAULT_LINE_FILTER;
  return parseLineFilter(new URLSearchParams(window.location.search).get("filter"));
}

export default function NotesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useNoteAuth();
  const [lineFilter, setLineFilterState] = useState<LineFilter>(DEFAULT_LINE_FILTER);
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const ownerId = auth.status === "ready" && auth.ownerId ? auth.ownerId : null;

  const loadSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    setLineFilterState(readFilterFromLocation());
  }, []);

  useEffect(() => {
    const onPop = () => setLineFilterState(readFilterFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setLineFilter = useCallback(
    (nextFilter: LineFilter) => {
      setLineFilterState(nextFilter);
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      if (nextFilter === DEFAULT_LINE_FILTER) {
        params.delete("filter");
      } else {
        params.set("filter", nextFilter);
      }
      const query = params.toString();
      void router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const resetListFilters = useCallback(() => {
    setListSearch("");
    setLineFilter(DEFAULT_LINE_FILTER);
  }, [setLineFilter]);

  const filteredItems = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    let next = items;
    if (q) {
      next = next.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.preview || "").toLowerCase().includes(q),
      );
    }
    if (lineFilter === "unchecked") {
      next = next.filter((n) => Boolean(n.hasUncheckedLines));
    } else if (lineFilter === "checked") {
      next = next.filter((n) => Boolean(n.hasCheckedLines));
    }
    return next;
  }, [items, listSearch, lineFilter]);

  const loadList = useCallback(() => {
    if (!ownerId) return;
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setListError(null);

    const timeoutError = new Error(
      `${LIST_FETCH_TIMEOUT_MS / 1000} 秒以内に一覧を取得できませんでした。通信状況を確認し、「再読み込み」またはページの再読み込みをお試しください。`,
    );

    void Promise.race([
      listNotes(ownerId),
      new Promise<NoteListItem[]>((_, reject) => {
        window.setTimeout(() => reject(timeoutError), LIST_FETCH_TIMEOUT_MS);
      }),
    ])
      .then((rows) => {
        if (!mountedRef.current || loadSeqRef.current !== seq) return;
        setItems(rows);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current || loadSeqRef.current !== seq) return;
        setItems([]);
        setListError(
          err instanceof Error ? err.message : "ノート一覧の取得に失敗しました。",
        );
      })
      .finally(() => {
        if (!mountedRef.current || loadSeqRef.current !== seq) return;
        setLoading(false);
      });
  }, [ownerId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleToggleOnlyLine = useCallback(
    async (item: NoteListItem) => {
      if (!ownerId || item.lineCount !== 1 || !item.onlyLine) return;
      const line = item.onlyLine;
      const nextChecked = !line.checked;
      const nextLine: NoteLine = { text: line.text, checked: nextChecked };
      const payload = { title: item.title, lines: [nextLine] };
      const previewSlice = nextLine.text.trim().slice(0, 200);
      setTogglingId(item.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id !== item.id
            ? it
            : {
                ...it,
                onlyLine: nextLine,
                preview: previewSlice,
                hasUncheckedLines: !nextChecked,
                hasCheckedLines: nextChecked,
                updatedAt: Date.now(),
              },
        ),
      );
      try {
        await updateNote(item.id, ownerId, payload);
      } catch {
        void loadList();
        window.alert("チェックの更新に失敗しました。もう一度お試しください。");
      } finally {
        setTogglingId(null);
      }
    },
    [ownerId, loadList],
  );

  const handleDelete = useCallback(
    async (noteId: string) => {
      if (!ownerId) return;
      if (!window.confirm("このノートを削除しますか？")) return;
      setDeletingId(noteId);
      try {
        await deleteNote(noteId, ownerId);
        setItems((prev) => prev.filter((x) => x.id !== noteId));
      } catch {
        window.alert("削除に失敗しました。もう一度お試しください。");
      } finally {
        setDeletingId(null);
      }
    },
    [ownerId],
  );

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100">
      <AppHeader
        showPortalLink
        end={
          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2.5">
            <AuthToolbar />
            <div className="h-4 w-px shrink-0 self-center bg-teal-800/50" aria-hidden="true" />
            <Link
              href="/"
              title="白紙のメモを開く"
              className="rounded-md px-2 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-900/50 sm:px-3"
            >
              メモを書く
            </Link>
          </div>
        }
      />
      <main className="mx-auto w-full min-w-0 max-w-lg px-4 pb-16 pt-4">
        <h1 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          ノート一覧
        </h1>
        <LocalMigrationErrorBanner />
        {auth.status === "loading" || auth.status === "migrating" ? (
          <p className="text-zinc-400">
            {auth.status === "migrating" ? "未ログイン時のメモを同期しています…" : "読み込み中…"}
          </p>
        ) : auth.status === "error" ? (
          <p className="text-red-200">{auth.message}</p>
        ) : listError ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-100">
              {listError}
            </p>
            <button
              type="button"
              className="rounded-lg border border-teal-700/60 px-3 py-2 text-sm text-teal-100 hover:bg-teal-900/50"
              onClick={() => void loadList()}
            >
              再読み込み
            </button>
          </div>
        ) : loading ? (
          <p className="text-zinc-400">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-500">まだノートがありません。</p>
        ) : (
          <>
            <div className="mb-3 space-y-3">
              <div>
                <label htmlFor="notes-list-search" className="sr-only">
                  ノートを検索
                </label>
                <input
                  id="notes-list-search"
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="タイトル・本文の冒頭で検索…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full rounded-lg border border-teal-900/50 bg-teal-950/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-teal-600/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </div>
              <div>
                <span className="sr-only">行のチェック状態で絞り込み</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "all" as const, label: "すべて" },
                      { key: "unchecked" as const, label: "未チェック" },
                      { key: "checked" as const, label: "チェック済み" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        lineFilter === key
                          ? "bg-teal-700 text-white"
                          : "bg-teal-950/60 text-zinc-400 hover:bg-teal-900/50"
                      }`}
                      onClick={() => setLineFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {listSearch.trim() || lineFilter !== DEFAULT_LINE_FILTER ? (
                <p className="text-xs text-zinc-500">
                  {filteredItems.length} 件表示
                  {filteredItems.length === 0 ? "（一致なし）" : ""}
                </p>
              ) : null}
            </div>
            {filteredItems.length === 0 ? (
              <div className="space-y-3">
                <p className="text-zinc-500">条件に一致するノートがありません。</p>
                {items.length > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg border border-teal-700/60 px-3 py-2 text-sm text-teal-100 hover:bg-teal-900/50"
                    onClick={() => resetListFilters()}
                  >
                    検索・絞り込みをリセット
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-teal-900/40 overflow-x-hidden rounded-xl border border-teal-900/40 bg-teal-950/20">
                {filteredItems.map((n) => {
                  const titleText = (n.title ?? "").trim();
                  const previewText = (n.preview ?? "").trim();
                  const hasBody = previewText.length > 0;
                  const hasTitle = titleText.length > 0;
                  const labelForA11y =
                    [previewText, titleText]
                      .filter((s) => s.length > 0)
                      .join(" ")
                      .slice(0, 80) || "無題";
                  const showListCheckbox =
                    (n.lineCount ?? 0) === 1 && Boolean(n.onlyLine);
                  return (
                    <li key={n.id} className="flex min-w-0 items-stretch">
                      {/* 全行で同じ幅を確保し、チェック列の有無で右側がズレないようにする */}
                      <div className="flex w-12 shrink-0 flex-col items-center justify-center self-stretch border-r border-teal-900/40 px-1 py-2 sm:w-[3.25rem]">
                        {showListCheckbox && n.onlyLine ? (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={n.onlyLine.checked}
                            aria-label={
                              n.onlyLine.checked
                                ? "完了を解除（一覧）"
                                : "完了にする（一覧）"
                            }
                            title={n.onlyLine.checked ? "完了を解除" : "完了にする"}
                            disabled={togglingId === n.id || deletingId === n.id}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-teal-700/60 bg-teal-950/50 text-base leading-none text-teal-100 hover:bg-teal-900/60 disabled:opacity-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleToggleOnlyLine(n);
                            }}
                          >
                            {n.onlyLine.checked ? "☑" : "□"}
                          </button>
                        ) : null}
                      </div>
                      <Link
                        href={`/notes/edit?id=${encodeURIComponent(n.id)}`}
                        className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden px-2 py-3 pr-2 hover:bg-teal-900/30 active:bg-teal-900/40 sm:px-3"
                      >
                        {hasBody ? (
                          <>
                            <div className="line-clamp-3 break-words text-base font-medium leading-snug text-zinc-100">
                              {previewText}
                            </div>
                            {hasTitle ? (
                              <div className="mt-1.5">
                                <span className="inline-flex max-w-full rounded-md border border-teal-800/40 bg-teal-950/60 px-2 py-0.5 text-xs font-normal leading-tight text-zinc-500 line-clamp-1 break-words">
                                  {titleText}
                                </span>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="line-clamp-2 break-words text-base font-medium leading-snug text-zinc-100">
                            {hasTitle ? titleText : "（無題）"}
                          </div>
                        )}
                        <div className="mt-1.5 text-xs text-zinc-500">
                          {new Date(n.updatedAt).toLocaleString("ja-JP", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </Link>
                      <div className="flex w-[4.5rem] shrink-0 items-stretch self-stretch border-l border-teal-900/40 sm:min-w-[5rem]">
                        <button
                          type="button"
                          disabled={deletingId === n.id}
                          className="box-border flex h-full min-h-[3.25rem] w-full items-center justify-center px-2 py-3 text-sm font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50 sm:px-3"
                          aria-label={`「${labelForA11y}」を削除`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDelete(n.id);
                          }}
                        >
                          {deletingId === n.id ? "…" : "削除"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
