import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 앱 시작 시 저장된 세션 복원
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // 로그인/로그아웃 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 포그라운드/백그라운드 전환 시 토큰 자동 갱신 제어 (Supabase React Native 권장 패턴)
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
      supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()
        .then(async ({ data, error }) => {
          if (error) {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          } else if (!data?.nickname) {
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
    </Stack>
  );
}
