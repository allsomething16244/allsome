import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getActiveRoom } from '../lib/activeRoom';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    try {
      const data = notification.request.content.data ?? {};
      const recipientUserId = data.recipientUserId as string | undefined;

      if (recipientUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== recipientUserId) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
        }
      }

      // 채팅방 안에 있을 때 해당 방 메시지 알림 억제
      const roomId = data.room_id as string | undefined;
      if (roomId && getActiveRoom() === roomId) {
        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
      }

      return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true };
    } catch {
      return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true };
    }
  },
});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const appState = useRef(AppState.currentState);
  const hasRouted = useRef(false);

  usePushNotifications(session?.user.id ?? null);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data ?? {};
      const recipientUserId = data.recipientUserId as string | undefined;
      if (recipientUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== recipientUserId) return;
      }
      const roomId = data.room_id as string | undefined;
      if (roomId) {
        router.push({ pathname: '/chat/[id]', params: { id: roomId } });
      } else {
        router.push('/(tabs)/chat');
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        hasRouted.current = false;
        setSession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        supabase.auth.startAutoRefresh();
      } else if (nextState.match(/inactive|background/)) {
        supabase.auth.stopAutoRefresh();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    if (session) {
      // 이미 라우팅한 상태면 토큰 갱신 등으로 재실행돼도 다시 라우팅하지 않음
      if (hasRouted.current) return;
      hasRouted.current = true;

      supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            // 쿼리 에러(네트워크 등) → 로그인으로, signOut은 하지 않음
            hasRouted.current = false;
            router.replace('/(auth)/login');
            return;
          }
          if (!data?.nickname) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)/home');
          }
        });
    } else {
      router.replace('/(auth)/login');
    }
  }, [session, initialized]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="heart-shop" />
    </Stack>
  );
}
