// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAm_vb1QXqY2EP0HlEDKZRtGPefJ7EzhCY",
  authDomain: "goddard-12.firebaseapp.com",
  projectId: "goddard-12",
  storageBucket: "goddard-12.firebasestorage.app",
  messagingSenderId: "519558862892",
  appId: "1:519558862892:web:f6bc581e961c93f67f9989",
  measurementId: "G-5VYD6L57Q9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const messaging = getMessaging(app);