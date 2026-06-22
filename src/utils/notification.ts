import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";

export const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    console.log("Notification permission denied");
    return null;
  }

  console.log("Notification permission granted");
  
  const token = await getToken(messaging, {
    vapidKey: "BAzvX-s-olSORBNrmLY_Oi0cot3kpfx7HcWLDFqQsvIO7JLMDHDuNiZcLrZJZq2nRl-PxB7P8xPPAApTLXiXTto"
  });

  console.log("FCM Token:", token);
  return token;
};

export const setupForegroundMessageListener = () => {
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Display notification to user
    if (payload.notification) {
      const { title, body } = payload.notification;
      new Notification(title || 'New Message', {
        body: body || 'You have a new message',
        icon: '/favicon.ico'
      });
    }
  });
};