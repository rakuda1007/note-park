/* Note Park — Service Worker v2（PWA 更新検知用。内容を変えるとクライアントが更新を検知する） */
/* 更新時はクライアントから SKIP_WAITING が送られるまで待機し、強制再読み込みで反映しやすくする */

self.addEventListener("install", () => {
  /* 初回は即アクティブ化、2回目以降の更新は waiting のまま（skipWaiting は message で） */
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
