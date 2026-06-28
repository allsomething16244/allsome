import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    registerForPushNotifications(userId);
  }, [userId]);
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat-requests', {
      name: '채팅 신청',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (e) {
    console.warn('Push token 등록 실패:', e);
  }
}
