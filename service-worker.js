const GHPATH = `.`;

const VERSION = `v1.2`;
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
  `${GHPATH}/public/favicon.ico`,
  `${GHPATH}/public/apple-touch-icon.png`,
  // add more paths if you need
  // `${GHPATH}/js/app.js`
]


// On install, cache the static resources
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    let ok;
    console.log('ServiceWorker: Caching files:', 
      APP_STATIC_RESOURCES.length, APP_STATIC_RESOURCES);
    try {
      ok = await cache.addAll(APP_STATIC_RESOURCES);
    } catch (err) {
      console.error('service worker failed: cache.addAll');
      for (let i of APP_STATIC_RESOURCES) {
        try {
          ok = await cache.add(i);
        } catch (err) {
          console.warn('service worker failed: cache.add',i);
        }
      }
    }

    return ok;
  }));

  console.log('ServiceWorker installed');
});

// Delete old caches on activate
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      var cacheWhitelist = keyList.filter(function (key) {
        return key.indexOf(APP_PREFIX)
      })
      cacheWhitelist.push(CACHE_NAME);
      return Promise.all(keyList.map(function (key, i) {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('Deleting cache : ' + keyList[i]);
          return caches.delete(keyList[i])
        }
      }))
    })
  )
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