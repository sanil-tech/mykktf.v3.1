/**
 * MyKKTF Web Push Notification Manager
 * Handles Service Worker registration and native phone notification triggers
 */

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (err) {
      console.warn('[MyKKTF] ServiceWorker registration failed:', err);
    }
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
