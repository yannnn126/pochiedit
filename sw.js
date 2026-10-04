// PochiEdit 離線快取
// 只處理本站自己的檔案；AI 模型（Hugging Face）、AI 執行環境（jsdelivr）、MediaPipe 等外部檔案一律不攔截，直接交給瀏覽器下載
const CACHE = 'pochiedit-shell-v3';
const SHELL = ['./', './index.html', './mobile.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // 清掉舊版的網頁快取；AI 模型快取（pochiedit-models-*）保留，不用重新下載
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && !k.startsWith('pochiedit-models')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部檔案：不經過這裡

  const isPage = req.mode === 'navigate' || /\.(html|json|js)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isPage) {
    // 網頁：先上網拿最新版（上傳新版後馬上生效），沒網路才用快取
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return r;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./mobile.html')))
    );
  } else {
    // 圖示等：先用快取
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
