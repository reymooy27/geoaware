const CACHE_NAME = 'geoaware-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// ─── Cache Setup ───────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch Strategy ────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.hostname.includes('mapbox') || url.hostname.includes('tiles')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// ─── Push Notification ─────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {
    title: '⚠️ Gempa Terdeteksi',
    body: 'Ada gempa baru di dekat Anda',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'earthquake',
    requireInteraction: false,
    data: { url: '/alerts' },
  };

  // Parse push data from server
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      // If not JSON, use as body text
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      data: data.data,
      actions: [
        { action: 'open', title: 'Lihat Detail' },
        { action: 'dismiss', title: 'Tutup' },
      ],
      vibrate: [200, 100, 200],
    })
  );
});

// ─── Notification Click ────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/alerts';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if already open on the right URL
      for (const client of clients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── Push Subscription Rotated ─────────────────────────────────
// Push services rotate endpoints; without re-registering, pushes silently stop.

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const res = await fetch('/api/alerts/push/public-key');
      const { key } = await res.json();
      if (!key) return;
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      await fetch('/api/alerts/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys }),
      });
    } catch {
      // Re-rotated later or offline; nothing actionable here.
    }
  })());
});

// ─── Offline Region Download ───────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'DOWNLOAD_REGION') {
    downloadRegion(event.data.bounds, event.data.zoomRange);
  }
});

async function downloadRegion(bounds, zoomRange) {
  const [minZoom, maxZoom] = zoomRange;
  const tiles = [];
  
  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = Math.floor((bounds.minLng + 180) / 360 * Math.pow(2, z));
    const xMax = Math.floor((bounds.maxLng + 180) / 360 * Math.pow(2, z));
    const yMin = Math.floor((1 - Math.log(Math.tan(bounds.maxLat * Math.PI / 180) + 1 / Math.cos(bounds.maxLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    const yMax = Math.floor((1 - Math.log(Math.tan(bounds.minLat * Math.PI / 180) + 1 / Math.cos(bounds.minLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  const cache = await caches.open(`${CACHE_NAME}-offline`);
  
  for (let i = 0; i < tiles.length; i += 10) {
    const batch = tiles.slice(i, i + 10);
    await Promise.all(batch.map(async ({ z, x, y }) => {
      const url = `https://tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.pbf?access_token=${MAPBOX_TOKEN}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {}
    }));
    
    const progress = Math.round(((i + batch.length) / tiles.length) * 100);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', progress });
      });
    });
  }
  
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'DOWNLOAD_COMPLETE', bounds });
    });
  });
}

const MAPBOX_TOKEN = ''; // Will be injected at build time
