// Service worker du Carnet de révisions.
// Rôle : garder une copie locale du site pour qu'il fonctionne hors-ligne,
// tout en servant la version la plus fraîche dès qu'il y a du réseau.

var CACHE_NAME = "carnet-revisions-v1"; // change juste ce numéro si tu ajoutes/renomme un fichier précaché

var PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var isPage = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (isPage) {
    // Page HTML : on va d'abord chercher la version en ligne (toujours la plus fraîche),
    // et on retombe sur la copie locale si le téléphone est hors-ligne.
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (res) { return res || caches.match("./index.html"); });
        })
    );
    return;
  }

  // Le reste (icônes, manifest, polices) : copie locale d'abord, réseau en secours.
  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        return res;
      });
    })
  );
});
