import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    const domain = trimmed.split('@')[1];
    if (!domain) {
      Alert.alert('이메일 형식을 확인해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 회사 도메인 검증
      const { data, error } = await supabase
        .from('company_domains')
        .select('company_id')
        .eq('domain', domain)
        .single();

      if (error || !data) {
        Alert.alert('등록되지 않은 회사 이메일입니다.');
        return;
      }

      // OTP 발송 (Edge Function 호출 — 아직 미구현, 추후 교체)
      Alert.alert('준비 중', 'OTP 발송 기능은 곧 추가됩니다.');
      router.push({ pathname: '/(auth)/otp', params: { email: trimmed } });
    } catch (e) {
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
        <Text style={styles.title}>올썸</Text>
        <Text style={styles.subtitle}>회사 이메일로 시작하세요</Text>

        <TextInput
          style={styles.input}
          placeholder="회사 이메일 주소"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '확인 중...' : '인증코드 받기'}
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
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
