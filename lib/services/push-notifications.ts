import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and save token to Supabase
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });
  }

  // Check if we already have permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If not granted, request permission
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If still not granted, return null
  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get the Expo push token
  try {
    // Get project ID from Constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId 
      ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.log('No EAS project ID found, skipping push token registration');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    const token = tokenData.data;
    console.log('Expo Push Token:', token);

    // Save token to user's profile in Supabase
    const { error } = await (supabase
      .from('profiles') as any)
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save push token:', error);
    }

    return token;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Remove push token when user logs out
 */
export async function unregisterPushNotifications(userId: string): Promise<void> {
  try {
    await (supabase
      .from('profiles') as any)
      .update({ expo_push_token: null })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to remove push token:', error);
  }
}

/**
 * Set up notification response handler (when user taps notification)
 */
export function setupNotificationListeners() {
  // Handle notification tap when app is in foreground or background
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data?.type === 'follow' && data?.actorUsername) {
      router.push(`/user/${data.actorUsername}` as any);
    } else if (data?.postId) {
      router.push(`/post/${data.postId}` as any);
    }
  });

  return () => subscription.remove();
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Immediately
  });
}
