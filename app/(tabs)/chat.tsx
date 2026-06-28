import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface PendingRequest {
  request_id: string;
  from_user_id: string;
  from_nickname: string;
  from_company_name: string | null;
  requested_at: string;
}

interface ChatRoom {
  room_id: string;
  partner_user_id: string;
  partner_nickname: string;
  partner_company_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

export default function ChatScreen() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchAll = async () => {
        setLoading(true);
        const [{ data: reqData }, { data: roomData }] = await Promise.all([
          supabase.rpc('get_pending_requests'),
          supabase.rpc('get_my_chat_rooms'),
        ]);
        setRequests(reqData ?? []);
        setRooms(roomData ?? []);
        setLoading(false);
      };
      fetchAll();
    }, [])
  );

  const handleAccept = async (requestId: string) => {
    const { data: roomId, error } = await supabase.rpc('accept_chat_request', { p_request_id: requestId });
    if (error || !roomId) {
      Alert.alert('오류가 발생했습니다.');
      return;
    }
    setRequests(prev => prev.filter(r => r.request_id !== requestId));
    router.push({ pathname: '/chat/[id]', params: { id: roomId } });
  };

  const handleReject = async (requestId: string) => {
    const { error } = await supabase.rpc('reject_chat_request', { p_request_id: requestId });
    if (error) {
      Alert.alert('오류가 발생했습니다.');
      return;
    }
    setRequests(prev => prev.filter(r => r.request_id !== requestId));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const isEmpty = requests.length === 0 && rooms.length === 0;

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
              {requests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>받은 신청</Text>
                  {requests.map(req => (
                    <View key={req.request_id} style={styles.requestCard}>
                      <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>{req.from_nickname[0]}</Text>
                      </View>
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestNickname}>{req.from_nickname}</Text>
                        {req.from_company_name && (
                          <Text style={styles.requestCompany}>{req.from_company_name}</Text>
                        )}
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleReject(req.request_id)}
                        >
                          <Text style={styles.rejectText}>거절</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAccept(req.request_id)}
                        >
                          <Text style={styles.acceptText}>수락</Text>
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
                      <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>{room.partner_nickname[0]}</Text>
                      </View>
                      <View style={styles.roomInfo}>
                        <Text style={styles.roomNickname}>{room.partner_nickname}</Text>
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {room.last_message ?? '대화를 시작해보세요'}
                        </Text>
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarSmallText: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
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
  acceptText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  roomInfo: { flex: 1 },
  roomNickname: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  lastMessage: { fontSize: 13, color: Colors.textSecondary },
});
