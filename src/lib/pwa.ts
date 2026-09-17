/**
 * Registers the hand-rolled service worker (public/sw.js) that turns the app
 * into an installable, offline-capable PWA. Requires a secure context
 * (https) or localhost — silently skips otherwise.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline shell is a progressive enhancement — never block the app */
    });
  });
}