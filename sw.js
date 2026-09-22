// Service worker do Cine Sinc.
// Estratégia "network-first": sempre tenta a versão mais nova do site (evita
// ficar preso numa versão antiga depois que você publica no Lovable) e só usa
// o cache quando o celular está sem internet. É o suficiente para o app poder
// ser instalado na tela inicial (Android/Chrome exigem um service worker).

const CACHE = 'cine-sinc-v1';

self.addEventListener('install', (event) => {
  // Ativa a versão nova imediatamente, sem esperar fechar as abas.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches antigos de versões anteriores.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só cuidamos de GET. POST/PUT (login, dados) passam direto para a rede.
  if (req.method !== 'GET') return;

  // Navegação de páginas (abrir o app / trocar de tela): rede primeiro,
  // com fallback para a última página guardada quando estiver offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('/', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  // Demais arquivos (js, css, imagens): tenta rede e guarda uma cópia;
  // se estiver offline, usa a cópia guardada.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200 && new URL(req.url).origin === self.location.origin) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        throw new Error('offline e sem cache');
      }
    })()
  );
});
