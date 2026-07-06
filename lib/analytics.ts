// Minimal client-side event tracking. Fire-and-forget beacon to our own API.
export function track(event: string, meta?: Record<string, string>) {
  try {
    const payload = JSON.stringify({ event, path: window.location.pathname, meta });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/event", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/public/event", { method: "POST", body: payload, keepalive: true });
    }
  } catch {
    // analytics must never break the page
  }
}
