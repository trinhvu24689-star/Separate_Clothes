const CACHE_NAME = 'separate-clothes-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/components/ImageLayer.tsx',
  '/components/LayerSidebar.tsx',
  '/components/AuthScreen.tsx',
  '/components/HamburgerMenu.tsx',
  '/components/ResolutionSelector.tsx',
  '/components/ImageCompareSlider.tsx',
  '/screens/ProfileScreen.tsx',
  '/screens/ShopScreen.tsx',
  '/screens/AdminPanel.tsx',
  '/screens/FreeDrawCanvas.tsx',
  '/screens/HistoryScreen.tsx',
  '/screens/ChatScreen.tsx',
  '/types.ts',
  '/utils/imageUtils.ts',
  '/utils/appUtils.ts',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
  // Add other static assets, fonts, etc.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Fallback for offline if request fails
          return new Response('<h1>Bạn đang offline!</h1>', { headers: { 'Content-Type': 'text/html' } });
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});