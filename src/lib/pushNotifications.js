/**
 * MyKKTF Web Push Notification Manager
 * Handles Service Worker registration and native phone notification triggers
 */

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  // In dev, never register a SW — and aggressively tear down any stale worker
  // (e.g. a leftover /sw.js from a previous session) that would cache-serve
  // outdated /src or /node_modules/.vite chunks. A stale graph mismatching the
  // current React/ReactDOM is what triggers "Cannot read properties of null
  // (reading 'useState')" at runtime.
  if (import.meta.env.DEV) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.warn('[MyKKTF] ServiceWorker registration failed:', err);
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    return 'denied';
  }
}

export async function showPhoneNotification(title, body, url = '/') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        reg.showNotification(title, {
          body,
          icon: 'https://img.icons8.com/color/192/university.png',
          badge: 'https://img.icons8.com/color/96/university.png',
          vibrate: [200, 100, 200],
          data: { url }
        });
        return;
      }
    }

    new Notification(title, {
      body,
      icon: 'https://img.icons8.com/color/192/university.png'
    });
  } catch (err) {
    console.warn('[MyKKTF] Notification display failed:', err);
  }
}