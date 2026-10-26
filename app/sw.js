// Necesario para que el celular ofrezca "Instalar app".
// No guarda datos de pacientes. Pide siempre la versión más nueva de los archivos de la app
// (así los cambios se ven enseguida, sin quedarse con una copia vieja).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).catch(() => fetch(r)));
});
