import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function OtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('6자리 인증코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email, code: otp }),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        Alert.alert(result.error ?? '오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      // hashed_token으로 세션 발급
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: result.hashed_token,
        type: 'magiclink',
      });

      if (sessionError) {
        Alert.alert('로그인에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // 라우팅은 _layout.tsx의 onAuthStateChange → 프로필 조회 결과에 따라 처리
    } catch {
      Alert.alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>인증코드 입력</Text>
        <Text style={styles.subtitle}>{email}으로{'\n'}발송된 6자리 코드를 입력하세요</Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={Colors.textSecondary}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={otp.length !== 6 || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '확인 중...' : '확인'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 40,
  },
  input: {
    height: 64,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: 8,
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
