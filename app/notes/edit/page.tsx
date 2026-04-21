"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NoteEditor from "@/components/NoteEditor";

function EditNoteInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id) {
    return (
      <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 px-4 py-8 text-zinc-100">
        <p className="text-red-200">ノート ID が指定されていません。</p>
      </div>
    );
  }
  return <NoteEditor mode="edit" initialNoteId={id} />;
}

export default function EditNotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-zinc-950 px-4 py-8 text-zinc-400">
          読み込み中…
        </div>
      }
    >
      <EditNoteInner />
    </Suspense>
  );
}
