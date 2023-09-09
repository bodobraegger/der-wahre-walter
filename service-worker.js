const GHPATH = `.`;
// Change to a different app prefix name
const APP_PREFIX = 'the_true_';
const VERSION = `version_01`;

// The files to make available for offline use. make sure to add 
// others to this list
const URLS = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/walter_cards.json`,
  `${GHPATH}/site.webmanifest`,
  `${GHPATH}/styles.css`,
  `${GHPATH}/public/favicon.ico`,
  `${GHPATH}/public/apple-touch-icon.png`,
  // add more paths if you need
  // `${GHPATH}/js/app.js`
]

const CACHE_NAME = APP_PREFIX + VERSION
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
})

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    let ok;
    console.log('ServiceWorker: Caching files:', URLS.length, URLS);
    try {
      ok = await cache.addAll(URLS);
    } catch (err) {
      console.error('service worker failed: cache.addAll');
      for (let i of URLS) {
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
})