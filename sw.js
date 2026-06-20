const CACHE = 'vetcare-v64';
const basePath = location.pathname.includes('/vetcare-web/') ? '/vetcare-web' : '';
const ASSETS = [
  basePath + '/',
  basePath + '/login.html',
  basePath + '/index.html',
  basePath + '/archive.html',
  basePath + '/patient.html',
  basePath + '/new-patient.html',
  basePath + '/edit-patient.html',
  basePath + '/add-vitals.html',
  basePath + '/edit-vitals.html',
  basePath + '/add-therapy.html',
  basePath + '/edit-therapy.html',
  basePath + '/add-echo.html',
  basePath + '/edit-echo.html',
  basePath + '/style.css',
  basePath + '/db.js',
  basePath + '/board.html',
  basePath + '/vetcare_medicines.json',
  basePath + '/diets.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // Lascia che il browser gestisca CDN esterni con la sua cache HTTP nativa
  const url = e.request.url;
  if (url.includes('gstatic.com') || url.includes('googleapis.com') ||
      url.includes('firebaseapp.com') || url.includes('firebaseio.com') ||
      url.includes('esm.sh')) {
    return;
  }
  // Cache-first per gli asset statici dell'app
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
