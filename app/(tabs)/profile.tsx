import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface Profile {
  email: string;
  nickname: string;
  gender: 'M' | 'F' | null;
  birth_year: number | null;
  company_id: number | null;
}

interface Company {
  name: string;
}

const GENDER_LABEL: Record<string, string> = { M: '남성', F: '여성' };

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('email, nickname, gender, birth_year, company_id')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);

        if (data.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', data.company_id)
            .single();
          setCompany(companyData);
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* 아바타 */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {profile?.nickname?.[0] ?? '?'}
        </Text>
      </View>

      <Text style={styles.nickname}>{profile?.nickname}</Text>
      <Text style={styles.email}>{profile?.email}</Text>

      {/* 정보 카드 */}
      <View style={styles.card}>
        <InfoRow label="회사" value={company?.name ?? '-'} />
        <InfoRow label="성별" value={profile?.gender ? GENDER_LABEL[profile.gender] : '-'} />
        <InfoRow label="출생연도" value={profile?.birth_year ? `${profile.birth_year}년` : '-'} last />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  nickname: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 32,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  logoutButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
});
