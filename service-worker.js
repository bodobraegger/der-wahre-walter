const GHPATH = `.`;

const VERSION = `v1.3`;
const APP_PREFIX = `the-true-walt`
const CACHE_NAME = `${APP_PREFIX}-${VERSION}`

const APP_STATIC_RESOURCES = [
  `${GHPATH}/`,
  `${GHPATH}/site.webmanifest`,
  `${GHPATH}/index.html`,
  `${GHPATH}/styles.css`,
  `${GHPATH}/data/walter_cards.json`,
  `${GHPATH}/js/cards.js`,
  `${GHPATH}/js/cookies.js`,
  `${GHPATH}/js/pwa-init.js`, // Added pwa-init.js
  `${GHPATH}/public/favicon.ico`,
  `${GHPATH}/public/apple-touch-icon.png`,
  // add more paths if you need
  // `${GHPATH}/js/app.js`
]


// On install, cache the static resources
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('ServiceWorker: Caching files:', APP_STATIC_RESOURCES.length, APP_STATIC_RESOURCES);
      try {
        await cache.addAll(APP_STATIC_RESOURCES);
      } catch (err) {
        console.error('ServiceWorker: cache.addAll failed:', err);
        console.log('ServiceWorker: Caching files individually as a fallback.');
        for (const resource of APP_STATIC_RESOURCES) {
          try {
            await cache.add(resource);
          } catch (addErr) {
            console.warn('ServiceWorker: cache.add failed for resource:', resource, addErr);
          }
        }
      }
    }).then(() => {
      console.log('ServiceWorker installed');
      return self.skipWaiting(); // Ensure the new service worker activates quickly
    })
  );
});

// Delete old caches on activate
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(keyList.map(function (key) {
        if (key !== CACHE_NAME && key.startsWith(APP_PREFIX)) { // Check prefix and not current cache
          console.log('Deleting old cache : ' + key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      console.log('ServiceWorker activated');
      return self.clients.claim(); // Ensure new SW takes control of open clients
    })
  );
});

// On fetch, intercept server requests
// and respond with cached responses instead of going to network
self.addEventListener('fetch', function (e) {
  console.log('Fetch request : ' + e.request.url);
  e.respondWith(
    caches.match(e.request).then(function (request) {
      if (request) {
        console.log('Responding with cache : ' + e.request.url);
        return request
      } else {
        console.log('File is not cached, fetching : ' + e.request.url);
        return fetch(e.request)
      }
    })
  )
});
