import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

const MAX_BIRTH_YEAR = new Date().getFullYear() - 18;
const MIN_BIRTH_YEAR = 1940;
const YEARS = Array.from(
  { length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 },
  (_, i) => MIN_BIRTH_YEAR + i,
);

const ITEM_HEIGHT = 48;
const VISIBLE = 5;

const GENDER_OPTIONS = [
  { label: '남성', value: 'M' },
  { label: '여성', value: 'F' },
] as const;

type Gender = 'M' | 'F';

function YearPicker({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    const idx = YEARS.indexOf(value);
    setTimeout(() => {
      ref.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    }, 50);
  }, []);

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    setSelected(YEARS[Math.max(0, Math.min(idx, YEARS.length - 1))]);
  };

  const handleScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const year = YEARS[Math.max(0, Math.min(idx, YEARS.length - 1))];
    setSelected(year);
    onChange(year);
  };

  return (
    <View style={pickerStyles.wrapper}>
      {/* 선택 영역 하이라이트 */}
      <View pointerEvents="none" style={pickerStyles.highlight} />
      {/* 상단 마스크 */}
      <View pointerEvents="none" style={[pickerStyles.mask, pickerStyles.maskTop]} />
      {/* 하단 마스크 */}
      <View pointerEvents="none" style={[pickerStyles.mask, pickerStyles.maskBottom]} />

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {YEARS.map((year) => (
          <View key={year} style={pickerStyles.item}>
            <Text style={[
              pickerStyles.itemText,
              selected === year && pickerStyles.itemTextSelected,
            ]}>
              {year}년
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: {
    height: ITEM_HEIGHT * VISIBLE,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 32,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE / 2),
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '0D',
    zIndex: 1,
  },
  mask: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * Math.floor(VISIBLE / 2),
    zIndex: 2,
  },
  maskTop: {
    top: 0,
    backgroundColor: Colors.surface + 'D0',
  },
  maskBottom: {
    bottom: 0,
    backgroundColor: Colors.surface + 'D0',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  itemTextSelected: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: '700',
  },
});

export default function OnboardingScreen() {
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState(MAX_BIRTH_YEAR);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      Alert.alert('닉네임을 입력해주세요.');
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
          birth_year: birthYear,
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
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>올썸에서 사용할 정보를 입력해주세요</Text>

        {/* 닉네임 */}
        <Text style={styles.label}>
          닉네임 <Text style={styles.required}>*</Text>
        </Text>
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
        <Text style={styles.label}>
          출생연도 <Text style={styles.required}>*</Text>
        </Text>
        <YearPicker value={birthYear} onChange={setBirthYear} />

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
    marginBottom: 10,
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
    marginBottom: 28,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  genderChip: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  genderChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  genderChipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  genderChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
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
