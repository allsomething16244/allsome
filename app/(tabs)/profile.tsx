import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>프로필 화면</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    color: Colors.text,
    marginBottom: 32,
  },
  logoutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
  },
});
