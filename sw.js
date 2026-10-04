/* PochiEdit 離線快取
 * 網頁本身：先抓網路上的最新版，沒網路才用快取（更新會馬上生效）
 * 字型、AI 執行環境、臉部模型：網址有版本號，抓過一次就直接用快取（秒開）
 * AI 修圖模型由網頁自己另外快取，這裡不重複存
 */
const VER = 'pochiedit-v2';
const CDN_CACHE = 'pochiedit-cdn-v1';
const CORE = ['./mobile.html', './icon-192.png', './icon-512.png', './manifest.json'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net\/npm\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/|storage\.googleapis\.com\/mediapipe-models\/)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => { })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^pochiedit-v\d/.test(k) && k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (name, req, res) => { if (res && (res.ok || (res.type === 'opaque' && name === CDN_CACHE))) { const cp = res.clone(); caches.open(name).then(c => c.put(req, cp)).catch(() => { }); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  if (req.mode === 'navigate' || (same && /\.html$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(res => put(VER, req, res)).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./mobile.html'))));
    return;
  }
  if (CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(CDN_CACHE, req, res))));
    return;
  }
  if (same && /\.(png|json|ico|svg|webp)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => { const net = fetch(req).then(res => put(VER, req, res)).catch(() => hit); return hit || net; }));
  }
});
