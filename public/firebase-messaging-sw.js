importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAm_vb1QXqY2EP0HlEDKZRtGPefJ7EzhCY",
  authDomain: "goddard-12.firebaseapp.com",
  projectId: "goddard-12",
  storageBucket: "goddard-12.firebasestorage.app",
  messagingSenderId: "519558862892",
  appId: "1:519558862892:web:f6bc581e961c93f67f9989",
  measurementId: "G-5VYD6L57Q9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});