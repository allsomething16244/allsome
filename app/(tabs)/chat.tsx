import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, router } from 'expo-router';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

function GenderAvatar({ gender }: { gender: string | null }) {
  const color = gender === 'F' ? Colors.primary : '#4A90E2';
  return (
    <View style={styles.avatarSmall}>
      <MaterialCommunityIcons name="account-circle" size={44} color={color} />
    </View>
  );
}

interface PendingRequest {
  request_id: string;
  from_user_id: string;
  from_nickname: string;
  from_company_name: string | null;
  from_birth_year: number | null;
  from_gender: string | null;
  requested_at: string;
}

interface SentRequest {
  request_id: string;
  to_user_id: string;
  to_nickname: string;
  to_company_name: string | null;
  to_birth_year: number | null;
  to_gender: string | null;
  requested_at: string;
}

interface ChatRoom {
  room_id: string;
  partner_user_id: string;
  partner_nickname: string;
  partner_company_name: string | null;
  partner_birth_year: number | null;
  partner_gender: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export default function ChatScreen() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-list-messages-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const { room_id, content, created_at } = payload.new as {
            room_id: string; content: string; created_at: string;
          };
          setRooms(prev => {
            const idx = prev.findIndex(r => r.room_id === room_id);
            if (idx === -1) return prev;
            const updated = {
              ...prev[idx],
              last_message: content,
              last_message_at: created_at,
              unread_count: prev[idx].unread_count + 1,
            };
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();
    if (isYesterday) return '어제';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatRemaining = (requestedAt: string) => {
    const expiresAt = new Date(requestedAt).getTime() + 24 * 60 * 60 * 1000;
    const diff = expiresAt - now;
    if (diff <= 0) return '만료됨';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    if (h > 0) return `${h}시간 ${m}분 ${s}초 남음`;
    if (m > 0) return `${m}분 ${s}초 남음`;
    return `${s}초 남음`;
  };

  useFocusEffect(
    useCallback(() => {
      const fetchAll = async () => {
        setLoading(true);
        const [{ data: reqData }, { data: roomData }, { data: sentData }] = await Promise.all([
          supabase.rpc('get_pending_requests'),
          supabase.rpc('get_my_chat_rooms'),
          supabase.rpc('get_sent_requests'),
        ]);
        setRequests(reqData ?? []);
        setRooms(roomData ?? []);
        setSentRequests(sentData ?? []);
        setLoading(false);
      };
      fetchAll();
    }, [])
  );

  const notifyChatResponse = async (requestId: string, action: 'accepted' | 'rejected') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    supabase.functions.invoke('notify-chat-response', {
      body: { request_id: requestId, action },
    }).catch(() => {});
  };

  const handleAccept = (requestId: string) => {
    Alert.alert(
      '채팅 수락',
      '수락하면 하트 3개가 차감돼요.\n수락하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '수락',
          onPress: async () => {
            const { data: roomId, error } = await supabase.rpc('accept_chat_request', { p_request_id: requestId });
            if (error) {
              if (error.message.includes('INSUFFICIENT_HEARTS')) {
                Alert.alert('하트가 부족해요', '채팅 수락에는 하트 3개가 필요해요.', [
                  { text: '취소', style: 'cancel' },
                  { text: '충전하기', onPress: () => router.push('/heart-shop') },
                ]);
              } else {
                Alert.alert('오류가 발생했습니다.');
              }
              return;
            }
            if (!roomId) { Alert.alert('오류가 발생했습니다.'); return; }
            setRequests(prev => prev.filter(r => r.request_id !== requestId));
            notifyChatResponse(requestId, 'accepted');
            router.push({ pathname: '/chat/[id]', params: { id: roomId } });
          },
        },
      ]
    );
  };

  const handleReject = (requestId: string) => {
    Alert.alert(
      '채팅 거절',
      '거절하면 상대방에게 하트 1개가 환불돼요.\n거절하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('reject_chat_request', { p_request_id: requestId });
            if (error) {
              Alert.alert('오류가 발생했습니다.');
              return;
            }
            setRequests(prev => prev.filter(r => r.request_id !== requestId));
            notifyChatResponse(requestId, 'rejected');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const isEmpty = requests.length === 0 && sentRequests.length === 0 && rooms.length === 0;

  return (
    <View style={styles.container}>
      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>아직 채팅이 없어요</Text>
          <Text style={styles.emptySubText}>홈에서 오늘의 추천 상대에게{'\n'}채팅을 신청해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={null}
          ListHeaderComponent={
            <>
              {sentRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>보낸 신청</Text>
                  {sentRequests.map(req => (
                    <View key={req.request_id} style={styles.requestCard}>
                      <TouchableOpacity
                        style={styles.profileTouchable}
                        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: req.to_user_id } })}
                      >
                        <GenderAvatar gender={req.to_gender} />
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestNickname}>
                            {req.to_nickname}{req.to_birth_year ? ` · ${new Date().getFullYear() - req.to_birth_year}세` : ''}
                          </Text>
                          {req.to_company_name && (
                            <Text style={styles.requestCompany}>{req.to_company_name}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>대기중</Text>
                        <Text style={styles.remainingText}>{formatRemaining(req.requested_at)}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {requests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>받은 신청</Text>
                  {requests.map(req => (
                    <View key={req.request_id} style={styles.requestCard}>
                      <TouchableOpacity
                        style={styles.profileTouchable}
                        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: req.from_user_id } })}
                      >
                        <GenderAvatar gender={req.from_gender} />
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestNickname}>
                            {req.from_nickname}{req.from_birth_year ? ` · ${new Date().getFullYear() - req.from_birth_year}세` : ''}
                          </Text>
                          {req.from_company_name && (
                            <Text style={styles.requestCompany}>{req.from_company_name}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.requestActions}>
                        <Text style={styles.remainingText}>{formatRemaining(req.requested_at)}</Text>
                        <TouchableOpacity
                          style={[styles.rejectButton, formatRemaining(req.requested_at) === '만료됨' && styles.buttonDisabled]}
                          onPress={() => handleReject(req.request_id)}
                          disabled={formatRemaining(req.requested_at) === '만료됨'}
                        >
                          <Text style={styles.rejectText}>거절</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.acceptButton, formatRemaining(req.requested_at) === '만료됨' && styles.buttonDisabled]}
                          onPress={() => handleAccept(req.request_id)}
                          disabled={formatRemaining(req.requested_at) === '만료됨'}
                        >
                          <Text style={styles.acceptText}>수락 🤍3</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {rooms.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>채팅</Text>
                  {rooms.map(room => (
                    <TouchableOpacity
                      key={room.room_id}
                      style={styles.roomCard}
                      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: room.room_id } })}
                    >
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: room.partner_user_id } })}
                      >
                        <GenderAvatar gender={room.partner_gender} />
                      </TouchableOpacity>
                      <View style={styles.roomInfo}>
                        <View style={styles.roomTopRow}>
                          <View style={styles.roomNameBlock}>
                            <Text style={styles.roomNickname} numberOfLines={1}>
                              {room.partner_nickname}{room.partner_birth_year ? ` · ${new Date().getFullYear() - room.partner_birth_year}세` : ''}
                            </Text>
                            {room.partner_company_name && (
                              <Text style={styles.roomCompany} numberOfLines={1}>{room.partner_company_name}</Text>
                            )}
                          </View>
                          {room.last_message_at && (
                            <Text style={styles.messageTime}>{formatMessageTime(room.last_message_at)}</Text>
                          )}
                        </View>
                        <View style={styles.roomBottomRow}>
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {room.last_message ?? '대화를 시작해보세요'}
                          </Text>
                          {room.unread_count > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadBadgeText}>
                                {room.unread_count > 99 ? '99+' : room.unread_count}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatarSmall: {
    marginRight: 12,
  },
  profileTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  requestInfo: { flex: 1 },
  requestNickname: { fontSize: 15, fontWeight: '600', color: Colors.text },
  requestCompany: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  rejectButton: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  rejectText: { fontSize: 13, color: Colors.textSecondary },
  acceptButton: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, backgroundColor: Colors.primary,
  },
  buttonDisabled: { backgroundColor: Colors.border, borderColor: Colors.border, opacity: 0.5 },
  acceptText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  pendingBadge: {
    alignItems: 'flex-end', gap: 2,
  },
  pendingBadgeText: { fontSize: 12, color: Colors.textSecondary },
  remainingText: { fontSize: 11, color: Colors.primary },
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  roomInfo: { flex: 1 },
  roomTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  roomNameBlock: { flex: 1, marginRight: 8 },
  roomNickname: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  roomCompany: { fontSize: 11, color: Colors.textSecondary, opacity: 0.7 },
  roomBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { fontSize: 13, color: Colors.textSecondary, flex: 1, marginRight: 6 },
  messageTime: { fontSize: 11, color: Colors.textSecondary, flexShrink: 0 },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});
