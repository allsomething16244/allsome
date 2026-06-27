import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { borderTopColor: Colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="chat" options={{ title: '채팅' }} />
      <Tabs.Screen name="profile" options={{ title: '프로필' }} />
    </Tabs>
  );
}
