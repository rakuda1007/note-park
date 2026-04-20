"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";
import { deleteNote, listNotes } from "@/lib/note/repository";
import type { NoteListItem } from "@/lib/types/note";

export default function NotesListPage() {
  const auth = useNoteAuth();
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const ownerId = auth.status === "ready" ? auth.ownerId : null;

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
          <ul className="divide-y divide-teal-900/40 rounded-xl border border-teal-900/40 bg-teal-950/20">
            {items.map((n) => (
              <li key={n.id} className="flex flex-col sm:flex-row sm:items-stretch">
                <Link
                  href={`/notes/edit?id=${encodeURIComponent(n.id)}`}
                  className="min-w-0 flex-1 px-4 py-3 hover:bg-teal-900/30 active:bg-teal-900/40"
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
                <div className="flex shrink-0 items-stretch border-t border-teal-900/40 sm:border-l sm:border-t-0">
                  <button
                    type="button"
                    disabled={deletingId === n.id}
                    className="w-full px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50 sm:w-auto sm:px-4"
                    aria-label={`「${n.preview || "無題"}」を削除`}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDelete(n.id);
                    }}
                  >
                    {deletingId === n.id ? "削除中…" : "削除"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
