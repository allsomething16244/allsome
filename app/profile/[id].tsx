import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

const GENDER_LABEL: Record<string, string> = { M: '남성', F: '여성' };

interface UserProfile {
  nickname: string;
  gender: string | null;
  birth_year: number | null;
  bio: string | null;
  company_name: string | null;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, gender, birth_year, bio, company_id, companies(name)')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        setError(true);
      } else {
        setProfile({
          nickname: data.nickname,
          gender: data.gender,
          birth_year: data.birth_year,
          bio: data.bio,
          company_name: (data.companies as { name: string } | null)?.name ?? null,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>프로필을 불러올 수 없습니다</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarColor = profile.gender === 'F' ? Colors.primary : '#4A90E2';
  const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.text} />
        <Text style={styles.backLabel}>뒤로</Text>
      </TouchableOpacity>

      <View style={styles.avatarWrap}>
        <MaterialCommunityIcons name="account-circle" size={100} color={avatarColor} />
      </View>

      <Text style={styles.nickname}>
        {profile.nickname}{age ? ` · ${age}세` : ''}
      </Text>

      <View style={styles.card}>
        <InfoRow label="성별" value={profile.gender ? GENDER_LABEL[profile.gender] : '-'} />
        <InfoRow label="출생연도" value={profile.birth_year ? `${profile.birth_year}년` : '-'} />
        <InfoRow label="회사" value={profile.company_name ?? '-'} last />
      </View>

      <View style={styles.bioCard}>
        <Text style={styles.bioTitle}>자기소개</Text>
        <Text style={profile.bio ? styles.bioText : styles.bioPlaceholder}>
          {profile.bio ?? '자기소개가 없습니다'}
        </Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backLabel: { fontSize: 16, color: Colors.text },
  avatarWrap: { alignItems: 'center', paddingVertical: 24 },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: 15, color: Colors.textSecondary },
  rowValue: { fontSize: 15, fontWeight: '500', color: Colors.text },
  bioCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: 20,
  },
  bioTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  bioText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  bioPlaceholder: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  backButton: { marginTop: 12 },
  backButtonText: { fontSize: 15, color: Colors.primary },
});
