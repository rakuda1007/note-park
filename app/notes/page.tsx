"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";
import { deleteNote, listNotes } from "@/lib/note/repository";
import type { NoteListItem } from "@/lib/types/note";

export default function NotesListPage() {
  const auth = useNoteAuth();
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const ownerId = auth.status === "ready" ? auth.ownerId : null;

  const filteredItems = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.preview || "").toLowerCase().includes(q),
    );
  }, [items, listSearch]);

  const loadList = useCallback(() => {
    if (!ownerId) return;
    setLoading(true);
    void listNotes(ownerId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [ownerId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

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
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <AppHeader
        end={
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-900/50"
          >
            新規
          </Link>
        }
      />
      <main className="mx-auto max-w-lg px-4 pb-16 pt-4">
        <h1 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          ノート一覧
        </h1>
        {auth.status === "loading" ? (
          <p className="text-zinc-400">読み込み中…</p>
        ) : auth.status === "error" ? (
          <p className="text-red-200">{auth.message}</p>
        ) : loading ? (
          <p className="text-zinc-400">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-500">まだノートがありません。</p>
        ) : (
          <>
            <div className="mb-3">
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
              {listSearch.trim() ? (
                <p className="mt-2 text-xs text-zinc-500">
                  {filteredItems.length} 件表示
                  {filteredItems.length === 0 ? "（一致なし）" : ""}
                </p>
              ) : null}
            </div>
            {filteredItems.length === 0 ? (
              <p className="text-zinc-500">検索に一致するノートがありません。</p>
            ) : (
              <ul className="divide-y divide-teal-900/40 rounded-xl border border-teal-900/40 bg-teal-950/20">
                {filteredItems.map((n) => (
                  <li key={n.id} className="flex items-stretch">
                    <Link
                      href={`/notes/edit?id=${encodeURIComponent(n.id)}`}
                      className="min-w-0 flex-1 px-3 py-3 pr-2 hover:bg-teal-900/30 active:bg-teal-900/40 sm:px-4"
                    >
                      <div className="font-medium text-zinc-100">
                        {n.preview || "（無題）"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {new Date(n.updatedAt).toLocaleString("ja-JP", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                    </Link>
                    <div className="flex w-[4.5rem] shrink-0 items-center justify-center border-l border-teal-900/40 sm:w-auto sm:min-w-[5rem]">
                      <button
                        type="button"
                        disabled={deletingId === n.id}
                        className="h-full w-full px-2 py-3 text-sm font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50 sm:px-3"
                        aria-label={`「${n.preview || "無題"}」を削除`}
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
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
