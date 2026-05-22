const CACHE = 'vetcare-v12';
const ASSETS = [
  '/vetcare-web/',
  '/vetcare-web/index.html',
  '/vetcare-web/patient.html',
  '/vetcare-web/new-patient.html',
  '/vetcare-web/add-vitals.html',
  '/vetcare-web/edit-vitals.html',
  '/vetcare-web/add-therapy.html',
  '/vetcare-web/edit-therapy.html',
  '/vetcare-web/style.css',
  '/vetcare-web/db.js',
  '/vetcare-web/board.html',
  '/vetcare-web/drugs.json',
  '/vetcare-web/diets.json'
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
