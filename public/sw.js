const CACHE_NAME = "financas-shell-v1"
const APP_SHELL = ["/dashboard", "/icon.png", "/logo-mark.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

// Network-first: financial data must stay fresh, so this only ever falls back
// to the cached app shell when there's genuinely no connection.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})
