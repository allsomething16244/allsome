import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface MatchProfile {
  matchUserId: string;
  nickname: string;
  gender: 'M' | 'F' | null;
  birth_year: number | null;
  company_name: string | null;
}

interface RequestState {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  requestId: string | null;
  roomId: string | null;
}

const GENDER_LABEL: Record<string, string> = { M: '남성', F: '여성' };
const CACHE_KEY = 'daily_match_cache';

export default function HomeScreen() {
  const [match, setMatch] = useState<MatchProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [noMatch, setNoMatch] = useState(false);
  const [request, setRequest] = useState<RequestState>({ status: 'none', requestId: null, roomId: null });
  const [requesting, setRequesting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toDateString();

      const fetchAll = async () => {
        setLoading(true);
        setNoMatch(false);

        // daily match (캐시 우선)
        let matchData: MatchProfile | null = null;
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { date, data } = JSON.parse(cached);
          if (date === today) {
            matchData = data;
          }
        }

        if (!matchData) {
          const { data, error } = await supabase.rpc('get_or_create_daily_match');
          if (error || !data || data.length === 0) {
            setNoMatch(true);
            setLoading(false);
            return;
          }
          const row = data[0];
          matchData = {
            matchUserId: row.match_user_id,
            nickname: row.nickname,
            gender: row.gender,
            birth_year: row.birth_year,
            company_name: row.company_name,
          };
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data: matchData }));
        }

        setMatch(matchData);

        // 채팅 신청 상태 조회 (매번 fresh)
        const { data: { user } } = await supabase.auth.getUser();
        if (user && matchData.matchUserId) {
          const { data: reqData } = await supabase
            .from('chat_requests')
            .select('id, status, room_id, from_user_id')
            .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${matchData.matchUserId}),and(from_user_id.eq.${matchData.matchUserId},to_user_id.eq.${user.id})`)
            .maybeSingle();

          if (!reqData) {
            setRequest({ status: 'none', requestId: null, roomId: null });
          } else if (reqData.status === 'accepted') {
            setRequest({ status: 'accepted', requestId: reqData.id, roomId: reqData.room_id });
          } else if (reqData.status === 'pending' && reqData.from_user_id === user.id) {
            setRequest({ status: 'pending_sent', requestId: reqData.id, roomId: null });
          } else if (reqData.status === 'pending' && reqData.from_user_id !== user.id) {
            setRequest({ status: 'pending_received', requestId: reqData.id, roomId: null });
          } else {
            setRequest({ status: 'none', requestId: null, roomId: null });
          }
        }

        setLoading(false);
      };

      fetchAll();
    }, [])
  );

  const handleSendRequest = async () => {
    if (!match) return;
    setRequesting(true);
    try {
      const { data: requestId, error } = await supabase.rpc('send_chat_request', {
        p_to_user_id: match.matchUserId,
      });

      if (error) {
        if (error.message.includes('NOT_TODAY_MATCH')) {
          Alert.alert('오늘의 추천 상대에게만 채팅을 신청할 수 있어요.');
        } else if (error.message.includes('ALREADY_EXISTS')) {
          Alert.alert('이미 채팅 신청이 있거나 채팅방이 존재해요.');
        } else {
          Alert.alert('오류가 발생했습니다. 다시 시도해주세요.');
        }
        return;
      }
      setRequest({ status: 'pending_sent', requestId: requestId as string, roomId: null });
    } finally {
      setRequesting(false);
    }
  };

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
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{match.nickname[0]}</Text>
        </View>

        <Text style={styles.nickname}>{match.nickname}</Text>

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

        {/* 채팅 버튼 */}
        {request.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.chatButton, styles.chatButtonActive]}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: request.roomId! } })}
          >
            <Text style={styles.chatButtonText}>채팅하기</Text>
          </TouchableOpacity>
        )}
        {request.status === 'pending_sent' && (
          <View style={[styles.chatButton, styles.chatButtonDisabled]}>
            <Text style={styles.chatButtonTextDisabled}>신청됨</Text>
          </View>
        )}
        {request.status === 'pending_received' && (
          <View style={[styles.chatButton, styles.chatButtonDisabled]}>
            <Text style={styles.chatButtonTextDisabled}>채팅 탭에서 확인하세요</Text>
          </View>
        )}
        {request.status === 'none' && (
          <TouchableOpacity
            style={[styles.chatButton, styles.chatButtonActive, requesting && styles.chatButtonDisabled]}
            onPress={handleSendRequest}
            disabled={requesting}
          >
            <Text style={styles.chatButtonText}>{requesting ? '신청 중...' : '채팅 신청'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.footerNote}>내일 새로운 추천 상대를 만날 수 있어요</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, alignItems: 'center', paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.primary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24,
  },
  card: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: 24,
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primary + '20', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: Colors.primary },
  nickname: { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.border },
  tagPrimary: { backgroundColor: Colors.primary + '18' },
  tagText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  tagTextPrimary: { color: Colors.primary },
  chatButton: {
    marginTop: 32, width: '100%', height: 48,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  chatButtonActive: { backgroundColor: Colors.primary },
  chatButtonDisabled: { backgroundColor: Colors.border },
  chatButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chatButtonTextDisabled: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
  footerNote: { marginTop: 32, fontSize: 13, color: Colors.textSecondary },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
