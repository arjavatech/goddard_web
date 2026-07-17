// FCM Service Worker — must be served at the root path /firebase-messaging-sw.js.
// Receives push events while the tab is closed or backgrounded.
//
// Service Workers can't read Vite's import.meta.env at runtime, and files in
// /public/ are served verbatim. To support one file in both environments we
// pick the Firebase config based on hostname. These values are public anyway
// (the same config also ships in the JS bundle).

/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Activate this SW immediately on install + take over any open tabs on activate.
// Without these, the previous SW keeps handling pushes for every tab that was
// open at deploy time — so a payload format change (e.g. switching to data-only)
// silently breaks notifications for those users until they close every tab.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Hostnames where the production Firebase project should be used. Everything
// else (localhost, *.pages.dev preview deploys, dev.goddard-web.pages.dev)
// falls back to the dev project so accidentally hitting the wrong tokens is
// impossible during development.
const PROD_HOSTNAMES = ['goddardschool.org', 'www.goddardschool.org'];

const isProd = PROD_HOSTNAMES.includes(self.location.hostname);

const firebaseConfig = isProd
  ? {
      apiKey: 'AIzaSyCsokdQ0-WYqvheCRBHS3ranZ4LXgpoCkg',
      authDomain: 'goddard-app-prod.firebaseapp.com',
      projectId: 'goddard-app-prod',
      messagingSenderId: '301816387731',
      appId: '1:301816387731:web:79e960a0b9551046475566',
    }
  : {
      apiKey: 'AIzaSyAl_NUjmebCXJ9LG2Nv9fW4lhx1xYHf3d4',
      authDomain: 'goddard-app-dev.firebaseapp.com',
      projectId: 'goddard-app-dev',
      messagingSenderId: '333927510663',
      appId: '1:333927510663:web:3b61e48df206ceea647e22',
    };

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Backend sends data-only payloads (title + body live inside `payload.data`)
// so the browser does not auto-display in background — this SW is the sole
// renderer and the user only sees one notification per event.
messaging.onBackgroundMessage((payload) => {
  const data = (payload && payload.data) || {};
  const title = data.title || 'Goddard';
  const body = data.body || '';
  self.registration.showNotification(title, {
    body,
    tag: data.notification_id || undefined,
    icon: '/images/gs_logo_lynnwood.png',
    badge: '/images/gs_logo_lynnwood.png',
    data: { url: data.action_url || '/admin/notifications' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if (w.url.includes(self.location.origin)) {
            w.focus();
            if ('navigate' in w) w.navigate(targetUrl);
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
