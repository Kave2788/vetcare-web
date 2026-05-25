const CACHE = 'vetcare-v26';
const basePath = location.pathname.includes('/vetcare-web/') ? '/vetcare-web' : '';
const ASSETS = [
  basePath + '/',
  basePath + '/index.html',
  basePath + '/patient.html',
  basePath + '/new-patient.html',
  basePath + '/edit-patient.html',
  basePath + '/add-vitals.html',
  basePath + '/edit-vitals.html',
  basePath + '/add-therapy.html',
  basePath + '/edit-therapy.html',
  basePath + '/style.css',
  basePath + '/db.js',
  basePath + '/board.html',
  basePath + '/drugs.json',
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
  // Network-first per le richieste Supabase, cache-first per gli asset statici
  if (e.request.url.includes('supabase.co') || e.request.url.includes('esm.sh')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
