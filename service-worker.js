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
    fetch(e.request).then(function (response) {
      // Check if we received a valid response
      if (!response || response.status !== 200 || response.type !== 'basic') {
        // If not, and it's a navigation request, try to serve from cache.
        // For other requests, just return the failed response (or throw an error).
        // This example prioritizes freshness for navigation.
        // For non-navigation, if network fails, it fails.
        // Consider if you want to cache non-GET requests or other types of responses.
        if (e.request.mode === 'navigate') {
          console.log('Network request failed, trying cache for navigation: ' + e.request.url);
          return caches.match(e.request);
        }
        return response; // Return the network error response for non-navigation
      }

      // IMPORTANT: Clone the response. A response is a stream
      // and because we want the browser to consume the response
      // as well as the cache consuming the response, we need
      // to clone it so we have two streams.
      var responseToCache = response.clone();

      caches.open(CACHE_NAME)
        .then(function (cache) {
          console.log('Caching new response : ' + e.request.url);
          cache.put(e.request, responseToCache);
        });

      return response;
    }).catch(function () {
      // Network request failed, try to serve from cache
      console.log('Network request failed, serving from cache : ' + e.request.url);
      return caches.match(e.request);
    })
  );
});
