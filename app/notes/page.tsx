"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useNoteAuth } from "@/lib/hooks/useNoteAuth";
import { listNotes } from "@/lib/note/repository";
import type { NoteListItem } from "@/lib/types/note";

export default function NotesListPage() {
  const auth = useNoteAuth();
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ownerId = auth.status === "ready" ? auth.ownerId : null;

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    void listNotes(ownerId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [ownerId]);

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
              <li key={n.id}>
                <Link
                  href={`/notes/edit?id=${encodeURIComponent(n.id)}`}
                  className="block px-4 py-3 hover:bg-teal-900/30"
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
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
