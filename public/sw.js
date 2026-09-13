// Bumped whenever APP_SHELL changes: activate below drops every cache that isn't
// this one, so the old shell never lingers on an installed app.
const CACHE_NAME = "folego-shell-v3"
// /inicio is the manifest's start_url — the page the installed app actually opens.
// /dashboard stays because it is still reachable from the menu.
// cache.addAll rejects outright if a single entry 404s, and then the new worker never
// installs — so renaming any asset listed here means updating this list with it.
const APP_SHELL = ["/inicio", "/dashboard", "/icon.png", "/logo-folego.png"]

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
