import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

const GENDER_OPTIONS = [
  { label: '남성', value: 'M' },
  { label: '여성', value: 'F' },
  { label: '선택 안함', value: 'N' },
] as const;

type Gender = 'M' | 'F' | 'N';

export default function OnboardingScreen() {
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      Alert.alert('닉네임을 입력해주세요.');
      return;
    }

    const parsedYear = birthYear ? parseInt(birthYear, 10) : null;
    if (birthYear && (isNaN(parsedYear!) || parsedYear! < 1900 || parsedYear! > new Date().getFullYear())) {
      Alert.alert('올바른 출생연도를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) {
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: trimmed,
          gender: gender ?? undefined,
          birth_year: parsedYear ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert('저장에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      router.replace('/(tabs)/home');
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
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>올썸에서 사용할 정보를 입력해주세요</Text>

        {/* 닉네임 */}
        <Text style={styles.label}>닉네임 <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="닉네임을 입력하세요"
          placeholderTextColor={Colors.textSecondary}
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          autoFocus
        />

        {/* 성별 */}
        <Text style={styles.label}>성별</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.genderChip, gender === opt.value && styles.genderChipSelected]}
              onPress={() => setGender(gender === opt.value ? null : opt.value)}
            >
              <Text style={[styles.genderChipText, gender === opt.value && styles.genderChipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 출생연도 */}
        <Text style={styles.label}>출생연도</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 1995"
          placeholderTextColor={Colors.textSecondary}
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="number-pad"
          maxLength={4}
        />

        <TouchableOpacity
          style={[styles.button, (!nickname.trim() || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!nickname.trim() || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '저장 중...' : '시작하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 24,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  genderChip: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  genderChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  genderChipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
