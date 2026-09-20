/**
 * Registers the hand-rolled service worker (public/sw.js) that turns the app
 * into an installable, offline-capable PWA. Requires a secure context
 * (https) or localhost — silently skips otherwise.
 *
 * The offline shell is only registered for production builds. In development
 * the worker must never run: an already-installed worker keeps serving cached
 * modules, so new code (and new routes) silently fail to appear. Any worker
 * left behind by an earlier session is unregistered here.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return;

  if (!import.meta.env.PROD) {
    // Development/preview: drop any stale worker so code changes apply.
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {
        /* nothing to clean up */
      });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline shell is a progressive enhancement — never block the app */
    });
  });
}
