import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface MatchProfile {
  nickname: string;
  gender: 'M' | 'F' | null;
  birth_year: number | null;
  company_name: string | null;
}

const GENDER_LABEL: Record<string, string> = { M: '남성', F: '여성' };

export default function HomeScreen() {
  const [match, setMatch] = useState<MatchProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [noMatch, setNoMatch] = useState(false);

  useEffect(() => {
    const fetchDailyMatch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 오늘의 매칭 ID 조회 or 생성
      const { data: matchId, error } = await supabase.rpc('get_or_create_daily_match', {
        p_user_id: user.id,
      });

      if (error || !matchId) {
        setNoMatch(true);
        setLoading(false);
        return;
      }

      // 매칭된 프로필 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, gender, birth_year, company_id')
        .eq('id', matchId)
        .single();

      if (!profile) {
        setNoMatch(true);
        setLoading(false);
        return;
      }

      let companyName: string | null = null;
      if (profile.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();
        companyName = company?.name ?? null;
      }

      setMatch({
        nickname: profile.nickname,
        gender: profile.gender,
        birth_year: profile.birth_year,
        company_name: companyName,
      });
      setLoading(false);
    };

    fetchDailyMatch();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (noMatch || !match) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>오늘의 추천 상대가 없어요</Text>
        <Text style={styles.emptySubText}>더 많은 멤버가 가입하면 추천이 시작돼요</Text>
      </View>
    );
  }

  const age = match.birth_year ? new Date().getFullYear() - match.birth_year : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.headerLabel}>오늘의 추천</Text>

      <View style={styles.card}>
        {/* 아바타 */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{match.nickname[0]}</Text>
        </View>

        <Text style={styles.nickname}>{match.nickname}</Text>

        {/* 정보 태그 */}
        <View style={styles.tagRow}>
          {match.gender && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{GENDER_LABEL[match.gender]}</Text>
            </View>
          )}
          {age && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{age}세</Text>
            </View>
          )}
          {match.company_name && (
            <View style={[styles.tag, styles.tagPrimary]}>
              <Text style={[styles.tagText, styles.tagTextPrimary]}>{match.company_name}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.footerNote}>내일 새로운 추천 상대를 만날 수 있어요</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  nickname: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  tagPrimary: {
    backgroundColor: Colors.primary + '18',
  },
  tagText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tagTextPrimary: {
    color: Colors.primary,
  },
  footerNote: {
    marginTop: 32,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
