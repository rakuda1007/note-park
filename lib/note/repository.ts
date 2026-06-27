import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { NoteLine, NoteListItem, NotePayload } from "@/lib/types/note";
import { isAdminCloudSyncAvailable } from "@/lib/admin/cloud-sync";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";

const LOCAL_OWNER = "local";
const LOCAL_STORAGE_KEY = "note-park-notes-v1";
const DB_NAME = "note-park-db";
const DB_VERSION = 1;
const NOTES_STORE = "notes";
const META_STORE = "app_meta";
const META_MIGRATION_KEY = "migration.localStorageToIndexedDB";
const META_MIGRATION_DONE = "v1_done";
const META_FIRESTORE_MIGRATION_PREFIX = "migration.firestoreToIndexedDB";

type StoredNote = NotePayload & {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
};

type MetaRow = {
  key: string;
  value: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;
const firestoreMigrationInFlight = new Map<string, Promise<{ migrated: number }>>();

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const notes = db.createObjectStore(NOTES_STORE, { keyPath: "id" });
        notes.createIndex("updatedAt", "updatedAt", { unique: false });
        notes.createIndex("ownerId", "ownerId", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
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
  if (lines.length === 0) {
    return { hasUncheckedLines: true, hasCheckedLines: false };
  }
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

function sanitizeStoredNote(input: unknown): StoredNote | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (typeof row.id !== "string" || row.id.length === 0) return null;
  const ownerId = typeof row.ownerId === "string" ? row.ownerId : LOCAL_OWNER;
  return {
    id: row.id,
    ownerId,
    title: typeof row.title === "string" ? row.title : "",
    lines: normalizeLines(row.lines),
    createdAt: timestampToMs(row.createdAt),
    updatedAt: timestampToMs(row.updatedAt),
  };
}

async function getMetaValue(key: string): Promise<string | null> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readonly");
  const store = tx.objectStore(META_STORE);
  const result = (await idbRequest(store.get(key))) as MetaRow | undefined;
  await idbTxDone(tx);
  return result?.value ?? null;
}

async function setMetaValue(key: string, value: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readwrite");
  tx.objectStore(META_STORE).put({ key, value } satisfies MetaRow);
  await idbTxDone(tx);
}

async function ensureLocalStorageMigration(): Promise<void> {
  if (typeof window === "undefined") return;
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const alreadyDone = await getMetaValue(META_MIGRATION_KEY);
    if (alreadyDone === META_MIGRATION_DONE) return;

    let parsed: Record<string, unknown> = {};
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const maybeParsed = JSON.parse(raw) as Record<string, unknown>;
        if (maybeParsed && typeof maybeParsed === "object") {
          parsed = maybeParsed;
        }
      }
    } catch {
      parsed = {};
    }

    const db = await openDb();
    const tx = db.transaction(NOTES_STORE, "readwrite");
    const notesStore = tx.objectStore(NOTES_STORE);
    for (const value of Object.values(parsed)) {
      const note = sanitizeStoredNote(value);
      if (!note) continue;
      notesStore.put(note);
    }
    await idbTxDone(tx);
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    await setMetaValue(META_MIGRATION_KEY, META_MIGRATION_DONE);
  })().finally(() => {
    migrationPromise = null;
  });
  return migrationPromise;
}

function firestoreMigrationMetaKey(ownerId: string): string {
  return `${META_FIRESTORE_MIGRATION_PREFIX}.${ownerId}`;
}

/**
 * 旧 Firestore (notes.ownerId == ownerId) から IndexedDB へ一度だけ取り込む。
 * 既存 id は上書きしない（ローカル編集を優先）。
 */
export async function migrateFirestoreNotesToIndexedDB(
  ownerId: string,
): Promise<{ migrated: number }> {
  if (typeof window === "undefined") return { migrated: 0 };
  if (!ownerId) return { migrated: 0 };
  if (!isFirebaseConfigured()) return { migrated: 0 };

  const existing = firestoreMigrationInFlight.get(ownerId);
  if (existing) return existing;

  const run = (async () => {
    await ensureLocalStorageMigration();
    const key = firestoreMigrationMetaKey(ownerId);
    const done = await getMetaValue(key);
    if (done === META_MIGRATION_DONE) return { migrated: 0 };

    const db = await openDb();
    const q = query(collection(getFirestoreDb(), "notes"), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);

    const tx = db.transaction(NOTES_STORE, "readwrite");
    const store = tx.objectStore(NOTES_STORE);
    let migrated = 0;

    for (const d of snap.docs) {
      const row = sanitizeStoredNote({
        id: d.id,
        ownerId,
        title: d.data().title,
        lines: d.data().lines,
        createdAt: d.data().createdAt?.toMillis?.() ?? Date.now(),
        updatedAt: d.data().updatedAt?.toMillis?.() ?? Date.now(),
      });
      if (!row) continue;

      const exists = await idbRequest(store.get(row.id));
      if (exists) continue;
      store.put(row);
      migrated += 1;
    }
    await idbTxDone(tx);
    await setMetaValue(key, META_MIGRATION_DONE);
    return { migrated };
  })().finally(() => {
    firestoreMigrationInFlight.delete(ownerId);
  });

  firestoreMigrationInFlight.set(ownerId, run);
  return run;
}

export async function fetchNote(
  noteId: string,
  ownerId: string,
): Promise<(NotePayload & { id: string; updatedAt: number }) | null> {
  if (typeof window === "undefined") return null;
  await ensureLocalStorageMigration();
  try {
    if (isCloudOwnerId(ownerId)) {
      const snap = await getDoc(doc(getFirestoreDb(), "notes", noteId));
      if (!snap.exists()) return null;
      const data = snap.data();
      if (data.ownerId !== ownerId) return null;
      return {
        id: snap.id,
        title: typeof data.title === "string" ? data.title : "",
        lines: normalizeLines(data.lines),
        updatedAt: timestampToMs(data.updatedAt),
      };
    }

    const db = await openDb();
    const tx = db.transaction(NOTES_STORE, "readonly");
    const note = sanitizeStoredNote(await idbRequest(tx.objectStore(NOTES_STORE).get(noteId)));
    await idbTxDone(tx);
    if (!note || note.ownerId !== ownerId) return null;
    return {
      id: note.id,
      title: note.title,
      lines: note.lines,
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
  if (typeof window === "undefined") return [];
  await ensureLocalStorageMigration();

  if (isCloudOwnerId(ownerId)) {
    const q = query(collection(getFirestoreDb(), "notes"), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapToNoteListItem(d.id, d.data()))
      .filter((x): x is NoteListItem => x !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readonly");
  const notes = (await idbRequest(tx.objectStore(NOTES_STORE).getAll()))
    .map((row) => sanitizeStoredNote(row))
    .filter((n): n is StoredNote => n !== null);
  await idbTxDone(tx);
  return notes
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
  if (typeof window === "undefined") {
    throw new Error("createNote can only run on client side");
  }
  await ensureLocalStorageMigration();

  if (isCloudOwnerId(ownerId)) {
    const ref = await addDoc(collection(getFirestoreDb(), "notes"), {
      ownerId,
      title: payload.title,
      lines: payload.lines,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  tx.objectStore(NOTES_STORE).put({
    id,
    ownerId,
    title: payload.title,
    lines: payload.lines,
    createdAt: now,
    updatedAt: now,
  } satisfies StoredNote);
  await idbTxDone(tx);
  return id;
}

export async function updateNote(
  noteId: string,
  ownerId: string,
  payload: NotePayload,
): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureLocalStorageMigration();

  if (isCloudOwnerId(ownerId)) {
    await updateDoc(doc(getFirestoreDb(), "notes", noteId), {
      title: payload.title,
      lines: payload.lines,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  const store = tx.objectStore(NOTES_STORE);
  const prev = sanitizeStoredNote(await idbRequest(store.get(noteId)));
  if (!prev || prev.ownerId !== ownerId) return;
  store.put({
    ...prev,
    title: payload.title,
    lines: payload.lines,
    updatedAt: Date.now(),
  } satisfies StoredNote);
  await idbTxDone(tx);
}

export async function deleteNote(noteId: string, ownerId: string): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureLocalStorageMigration();

  if (isCloudOwnerId(ownerId)) {
    await deleteDoc(doc(getFirestoreDb(), "notes", noteId));
    return;
  }

  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  const store = tx.objectStore(NOTES_STORE);
  const prev = sanitizeStoredNote(await idbRequest(store.get(noteId)));
  if (!prev || prev.ownerId !== ownerId) return;
  store.delete(noteId);
  await idbTxDone(tx);
}

export function getLocalOwnerId(): string {
  return LOCAL_OWNER;
}

/** 管理者クラウド同期中（ログイン済み）の ownerId かどうか */
export function isCloudOwnerId(ownerId: string): boolean {
  return isAdminCloudSyncAvailable() && isFirebaseConfigured() && ownerId !== LOCAL_OWNER;
}

const MIGRATE_TIMEOUT_MS = 60_000;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

let migrateInFlight: Promise<{ migrated: number }> | null = null;
let migrateInFlightUid: string | null = null;

/**
 * 未ログイン時に IndexedDB に溜めたノートを、ログイン後の UID 配下の Firestore に取り込む。
 * 成功後、該当エントリは IndexedDB から削除する。
 */
export async function migrateLocalNotesToFirebase(uid: string): Promise<{ migrated: number }> {
  if (!isFirebaseConfigured()) return { migrated: 0 };
  if (migrateInFlight && migrateInFlightUid === uid) {
    return migrateInFlight;
  }
  migrateInFlightUid = uid;
  const run = withTimeout(
    runMigrateLocalNotesToFirebaseBody(uid),
    MIGRATE_TIMEOUT_MS,
    `ローカルメモの同期が ${MIGRATE_TIMEOUT_MS / 1000} 秒以内に完了しませんでした。接続を確認のうえ、再ログインを試してください。`,
  );
  migrateInFlight = run.finally(() => {
    migrateInFlight = null;
    migrateInFlightUid = null;
  });
  return migrateInFlight;
}

async function runMigrateLocalNotesToFirebaseBody(uid: string): Promise<{ migrated: number }> {
  await ensureLocalStorageMigration();
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readonly");
  const all = (await idbRequest(tx.objectStore(NOTES_STORE).getAll()))
    .map((row) => sanitizeStoredNote(row))
    .filter((n): n is StoredNote => n !== null);
  await idbTxDone(tx);

  const toMigrate = all.filter((n) => n.ownerId === LOCAL_OWNER);
  if (toMigrate.length === 0) return { migrated: 0 };

  const firestore = getFirestoreDb();
  const col = collection(firestore, "notes");
  const CHUNK = 400;
  let done = 0;

  for (let i = 0; i < toMigrate.length; i += CHUNK) {
    const slice = toMigrate.slice(i, i + CHUNK);
    const batch = writeBatch(firestore);
    for (const n of slice) {
      const created =
        typeof n.createdAt === "number" && Number.isFinite(n.createdAt) ? n.createdAt : Date.now();
      const updated =
        typeof n.updatedAt === "number" && Number.isFinite(n.updatedAt) ? n.updatedAt : Date.now();
      const ref = doc(col);
      batch.set(ref, {
        ownerId: uid,
        title: typeof n.title === "string" ? n.title : "",
        lines: normalizeLines(n.lines),
        createdAt: Timestamp.fromMillis(created),
        updatedAt: Timestamp.fromMillis(updated),
      });
    }
    await batch.commit();

    const delTx = db.transaction(NOTES_STORE, "readwrite");
    const store = delTx.objectStore(NOTES_STORE);
    for (const n of slice) {
      store.delete(n.id);
    }
    await idbTxDone(delTx);
    done += slice.length;
  }

  return { migrated: done };
}
