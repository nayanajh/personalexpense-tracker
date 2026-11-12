const CACHE_NAME = "spendflow-shell-v5";
const APP_SHELL = [
    "/index.html",
    "/expenses.html",
    "/categories.html",
    "/features.html",
    "/welcome.html",
    "/login.html",
    "/register.html",
    "/style.css",
    "/script.js",
    "/auth.js",
    "/pwa.js",
    "/manifest.webmanifest",
    "/icons/spendflow.svg",
    "/icons/spendflow-192.png",
    "/icons/spendflow-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key.startsWith("spendflow-shell-") && key !== CACHE_NAME)
                .map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => (await caches.match(request)) || (await caches.match("/index.html")))
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(async error => {
                const cached = await caches.match(request);
                if (cached) return cached;
                throw error;
            })
    );
});
