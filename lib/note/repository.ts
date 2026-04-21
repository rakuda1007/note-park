import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { NoteLine, NoteListItem, NotePayload } from "@/lib/types/note";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";

const LOCAL_OWNER = "local";
const LOCAL_STORAGE_KEY = "note-park-notes-v1";

type StoredNote = NotePayload & {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
};

function readLocalStore(): Record<string, StoredNote> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredNote>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStore(data: Record<string, StoredNote>) {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

function timestampToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Date.now();
}

/** Firestore / 古い localStorage から読んだ行を安全に整形 */
function normalizeLines(raw: unknown): NoteLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    if (!row || typeof row !== "object") {
      return { text: "", checked: false };
    }
    const r = row as Record<string, unknown>;
    return {
      text: typeof r.text === "string" ? r.text : "",
      checked: Boolean(r.checked),
    };
  });
}

/** 一覧・検索用の本文抜粋（タイトルは含めない） */
function previewFromLines(lines: NoteLine[]): string {
  const joined = lines
    .map((l) => (typeof l.text === "string" ? l.text : "").trim())
    .filter(Boolean)
    .join(" ");
  return joined.slice(0, 200);
}

function lineCheckFlags(lines: NoteLine[]): {
  hasUncheckedLines: boolean;
  hasCheckedLines: boolean;
} {
  let hasUncheckedLines = false;
  let hasCheckedLines = false;
  for (const l of lines) {
    if (l.checked) hasCheckedLines = true;
    else hasUncheckedLines = true;
  }
  return { hasUncheckedLines, hasCheckedLines };
}

/**
 * 1件分の一覧用オブジェクトへ変換。想定外データで例外が出ても一覧全体を落とさず null。
 */
function mapToNoteListItem(
  id: string,
  data: { title?: unknown; lines?: unknown; updatedAt?: unknown },
): NoteListItem | null {
  try {
    const lines = normalizeLines(data.lines);
    const title = typeof data.title === "string" ? data.title : "";
    const flags = lineCheckFlags(lines);
    const lineCount = lines.length;
    return {
      id,
      title,
      preview: previewFromLines(lines),
      updatedAt: timestampToMs(data.updatedAt),
      lineCount,
      ...(lineCount === 1 ? { onlyLine: lines[0] } : {}),
      ...flags,
    };
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[note-park] list item skipped (invalid data)", id);
    }
    return null;
  }
}

export async function fetchNote(
  noteId: string,
  ownerId: string,
): Promise<(NotePayload & { id: string; updatedAt: number }) | null> {
  try {
    if (isFirebaseConfigured()) {
      const db = getFirestoreDb();
      const snap = await getDoc(doc(db, "notes", noteId));
      if (!snap.exists()) return null;
      const data = snap.data();
      if (data.ownerId !== ownerId) return null;
      const lines = normalizeLines(data.lines);
      const title = typeof data.title === "string" ? data.title : "";
      return {
        id: snap.id,
        title,
        lines,
        updatedAt: timestampToMs(data.updatedAt),
      };
    }

    const all = readLocalStore();
    const note = all[noteId];
    if (!note || note.ownerId !== ownerId) return null;
    const title = typeof note.title === "string" ? note.title : "";
    return {
      id: note.id,
      title,
      lines: normalizeLines(note.lines),
      updatedAt: timestampToMs(note.updatedAt),
    };
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[note-park] fetchNote failed", noteId);
    }
    return null;
  }
}

export async function listNotes(ownerId: string): Promise<NoteListItem[]> {
  if (isFirebaseConfigured()) {
    const db = getFirestoreDb();
    const q = query(
      collection(db, "notes"),
      where("ownerId", "==", ownerId),
      orderBy("updatedAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapToNoteListItem(d.id, d.data()))
      .filter((x): x is NoteListItem => x !== null);
  }

  const all = readLocalStore();
  return Object.values(all)
    .filter((n) => n.ownerId === ownerId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) =>
      mapToNoteListItem(n.id, {
        title: n.title,
        lines: n.lines,
        updatedAt: n.updatedAt,
      }),
    )
    .filter((x): x is NoteListItem => x !== null);
}

export async function createNote(ownerId: string, payload: NotePayload): Promise<string> {
  const now = Date.now();
  if (isFirebaseConfigured()) {
    const db = getFirestoreDb();
    const ref = await addDoc(collection(db, "notes"), {
      ownerId,
      title: payload.title,
      lines: payload.lines,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  const id = crypto.randomUUID();
  const all = readLocalStore();
  all[id] = {
    id,
    ownerId,
    title: payload.title,
    lines: payload.lines,
    createdAt: now,
    updatedAt: now,
  };
  writeLocalStore(all);
  return id;
}

export async function updateNote(
  noteId: string,
  ownerId: string,
  payload: NotePayload,
): Promise<void> {
  if (isFirebaseConfigured()) {
    const db = getFirestoreDb();
    await updateDoc(doc(db, "notes", noteId), {
      title: payload.title,
      lines: payload.lines,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const all = readLocalStore();
  const prev = all[noteId];
  if (!prev || prev.ownerId !== ownerId) return;
  all[noteId] = {
    ...prev,
    title: payload.title,
    lines: payload.lines,
    updatedAt: Date.now(),
  };
  writeLocalStore(all);
}

export async function deleteNote(noteId: string, ownerId: string): Promise<void> {
  if (isFirebaseConfigured()) {
    const db = getFirestoreDb();
    await deleteDoc(doc(db, "notes", noteId));
    return;
  }

  const all = readLocalStore();
  const prev = all[noteId];
  if (!prev || prev.ownerId !== ownerId) return;
  delete all[noteId];
  writeLocalStore(all);
}

export function getLocalOwnerId(): string {
  return LOCAL_OWNER;
}
