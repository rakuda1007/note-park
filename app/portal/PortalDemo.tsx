"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "notepark-portal-demo";
const MAX_ITEMS = 40;

type DemoItem = { id: string; text: string; done: boolean };

type StoredV2 = { v: 2; items: string[] };
type StoredV3 = { v: 3; items: DemoItem[] };

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeItem(x: unknown): DemoItem | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.text !== "string" || !o.text.trim()) return null;
  return {
    id: typeof o.id === "string" ? o.id : newId(),
    text: o.text,
    done: Boolean(o.done),
  };
}

function parseStored(raw: string | null): DemoItem[] {
  if (raw == null || raw === "") return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return [];
    const rec = data as Record<string, unknown>;
    if (rec.v === 3 && Array.isArray(rec.items)) {
      return rec.items
        .map(normalizeItem)
        .filter((x): x is DemoItem => x != null)
        .slice(0, MAX_ITEMS);
    }
    if (rec.v === 2 && "items" in rec) {
      const items = (rec as StoredV2).items;
      if (Array.isArray(items) && items.every((x) => typeof x === "string")) {
        return items
          .map((text) => ({ id: newId(), text, done: false }))
          .slice(0, MAX_ITEMS);
      }
    }
  } catch {
    return raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ id: newId(), text, done: false }))
      .slice(0, MAX_ITEMS);
  }
  return [];
}

function serialize(items: DemoItem[]): string {
  const payload: StoredV3 = { v: 3, items: items.slice(0, MAX_ITEMS) };
  return JSON.stringify(payload);
}

export default function PortalDemo() {
  const [line, setLine] = useState("");
  const [items, setItems] = useState<DemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      setItems(parseStored(raw));
    } catch {
      /* ストレージ不可環境 */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, serialize(items));
    } catch {
      /* プライベートモード等 */
    }
  }, [items, mounted]);

  const commitLine = useCallback(() => {
    const t = line.trim();
    if (!t) return;
    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) return prev;
      return [...prev, { id: newId(), text: t, done: false }];
    });
    setLine("");
  }, [line]);

  const toggleDone = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  }, []);

  const removeById = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-700/90">
        その場で試す
      </p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
        登録なしデモ
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        1行ずつ入力して Enter（または「追加」）。一覧では左の□をオンにすると完了扱いになります。データはこのタブのブラウザ内だけに保存されます。
      </p>

      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <label htmlFor="portal-demo-line" className="sr-only">
          1行メモ入力
        </label>
        <input
          id="portal-demo-line"
          type="text"
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitLine();
            }
          }}
          maxLength={200}
          spellCheck={false}
          placeholder="例: 買い物リスト — 牛乳"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[15px] text-slate-800 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-200/60"
        />
        <button
          type="button"
          onClick={commitLine}
          className="shrink-0 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 sm:w-auto"
        >
          追加
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        1行につき1件です。Enter か「追加」で確定すると、すぐ下のリストに反映されます。
      </p>

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-semibold text-slate-600">
            メモ一覧
            {items.length > 0 ? (
              <span className="ml-1.5 font-normal text-slate-500">
                （{items.length} 件・完了 {items.filter((i) => i.done).length}）
              </span>
            ) : null}
          </span>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              すべて消す
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            まだ行がありません。上の欄に打って Enter を押すと、ここに行が並びます。
          </p>
        ) : (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
            {items.map((item) => {
              const cbId = `portal-demo-done-${item.id}`;
              return (
                <li
                  key={item.id}
                  className="group flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white px-2 py-2 text-sm text-slate-800 shadow-sm transition-[box-shadow] duration-200 hover:shadow-md sm:px-3 sm:py-2.5"
                >
                  <input
                    id={cbId}
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleDone(item.id)}
                    className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 cursor-pointer rounded-sm border-2 border-slate-400 bg-white accent-sky-600 shadow-sm outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-sky-400"
                    aria-label={item.done ? "完了を解除" : "完了にする"}
                  />
                  <label
                    htmlFor={cbId}
                    className={`min-w-0 flex-1 cursor-pointer select-none break-words leading-relaxed ${
                      item.done ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"
                    }`}
                  >
                    {item.text}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeById(item.id)}
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-slate-400 opacity-70 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                    aria-label={`「${item.text.slice(0, 40)}」を削除`}
                  >
                    削除
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        タブを閉じるまで一覧は残ります。本番のノートは「今すぐノートを開く」からどうぞ。
      </p>
    </div>
  );
}
