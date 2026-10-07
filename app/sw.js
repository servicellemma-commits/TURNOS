// Necesario para que el celular ofrezca "Instalar app". No guarda datos de pacientes.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
