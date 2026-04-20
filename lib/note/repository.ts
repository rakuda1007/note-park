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

function previewFromLines(lines: NoteLine[]): string {
  const first = lines.find((l) => l.text.trim().length > 0);
  if (first) return first.text.trim().slice(0, 80);
  return "";
}

export async function fetchNote(
  noteId: string,
  ownerId: string,
): Promise<(NotePayload & { id: string; updatedAt: number }) | null> {
  if (isFirebaseConfigured()) {
    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, "notes", noteId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.ownerId !== ownerId) return null;
    const lines = (data.lines as NoteLine[] | undefined) ?? [];
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
  return {
    id: note.id,
    title: note.title,
    lines: note.lines,
    updatedAt: note.updatedAt,
  };
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
    return snap.docs.map((d) => {
      const data = d.data();
      const lines = (data.lines as NoteLine[] | undefined) ?? [];
      const title = typeof data.title === "string" ? data.title : "";
      return {
        id: d.id,
        title,
        preview: title.trim() || previewFromLines(lines),
        updatedAt: timestampToMs(data.updatedAt),
      };
    });
  }

  const all = readLocalStore();
  return Object.values(all)
    .filter((n) => n.ownerId === ownerId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.title.trim() || previewFromLines(n.lines),
      updatedAt: n.updatedAt,
    }));
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
