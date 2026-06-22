// Firebase Cloud Messaging client for the browser.
//
// Initialized lazily so the page still boots in browsers that don't support
// Service Workers / Notification API (e.g. Safari in private mode, older Firefox).
// All exports return Promises and safely no-op when FCM isn't supported.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let initialized = false;

async function ensureMessaging(): Promise<Messaging | null> {
  if (initialized) return messaging;
  initialized = true;

  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[firebase] missing env vars — push notifications disabled');
    return null;
  }
  try {
    const ok = await isSupported();
    if (!ok) return null;
  } catch {
    return null;
  }

  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  return messaging;
}

/**
 * Registers the FCM service worker (idempotent) and asks Firebase for a
 * registration token. Returns null if the browser can't do FCM, the user
 * hasn't granted permission, or env vars are missing.
 */
export async function requestFcmToken(): Promise<string | null> {
  const m = await ensureMessaging();
  if (!m) return null;
  if (!vapidKey) {
    console.warn('[firebase] VITE_FIREBASE_VAPID_KEY missing — cannot request token');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(m, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (err) {
    console.warn('[firebase] getToken failed:', err);
    return null;
  }
}

export async function deleteFcmToken(): Promise<void> {
  const m = await ensureMessaging();
  if (!m) return;
  try {
    await deleteToken(m);
  } catch (err) {
    console.warn('[firebase] deleteToken failed:', err);
  }
}

/**
 * Subscribe to FCM messages received while the tab is open. The Firebase SDK
 * does NOT auto-show OS notifications for foreground messages — the caller is
 * responsible for refetching the in-app drawer (and optionally showing a
 * fallback toast). For background pushes, see public/firebase-messaging-sw.js.
 */
export async function onForegroundMessage(
  cb: (payload: MessagePayload) => void
): Promise<() => void> {
  const m = await ensureMessaging();
  if (!m) return () => {};
  return onMessage(m, cb);
}
