import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/lib/stores';
import { 
  registerForPushNotifications, 
  setupNotificationListeners,
  unregisterPushNotifications,
  setBadgeCount
} from '@/lib/services/push-notifications';
import { useUnreadNotificationCount } from './use-notifications';

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListenerCleanup = useRef<(() => void) | null>(null);
  const previousUserId = useRef<string | null>(null);
  
  // Get unread count for badge sync
  const { data: unreadCount } = useUnreadNotificationCount();

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id && user.id !== previousUserId.current) {
      previousUserId.current = user.id;
      
      // Register for push notifications
      registerForPushNotifications(user.id).then((token) => {
        setExpoPushToken(token);
      });

      // Listen for incoming notifications (while app is foregrounded)
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

      // Set up tap handler
      responseListenerCleanup.current = setupNotificationListeners();
    }

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
        notificationListener.current = null;
      }
      if (responseListenerCleanup.current) {
        responseListenerCleanup.current();
        responseListenerCleanup.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  // Unregister when user logs out
  useEffect(() => {
    if (!isAuthenticated && previousUserId.current) {
      unregisterPushNotifications(previousUserId.current);
      previousUserId.current = null;
      setExpoPushToken(null);
    }
  }, [isAuthenticated]);

  // Sync badge count with unread notifications
  useEffect(() => {
    if (Platform.OS !== 'web' && unreadCount !== undefined) {
      setBadgeCount(unreadCount);
    }
  }, [unreadCount]);

  return {
    expoPushToken,
    notification,
    isRegistered: !!expoPushToken,
  };
}
