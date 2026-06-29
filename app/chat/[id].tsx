import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { setActiveRoom } from '../../lib/activeRoom';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Partner {
  partner_user_id: string;
  partner_nickname: string;
  partner_company_name: string | null;
  partner_birth_year: number | null;
  partner_gender: string | null;
  partner_last_read_at: string | null;
}

const PAGE_SIZE = 50;

export default function ChatRoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const oldestCreatedAt = useRef<string | null>(null);
  const partnerUserIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveRoom(roomId);
    return () => setActiveRoom(null);
  }, [roomId]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      userIdRef.current = user.id;

      const { data: partnerData } = await supabase.rpc('get_chat_room_partner', { p_room_id: roomId });
      if (partnerData && partnerData.length > 0) {
        setPartner(partnerData[0]);
        setPartnerLastReadAt(partnerData[0].partner_last_read_at ?? null);
        partnerUserIdRef.current = partnerData[0].partner_user_id;
      }

      // 입장 시 읽음 처리
      await supabase.rpc('mark_messages_read', { p_room_id: roomId });

      // 최신 PAGE_SIZE개 (내림차순 → inverted FlatList와 맞음)
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      const rows = data ?? [];
      setMessages(rows);
      if (rows.length > 0) oldestCreatedAt.current = rows[rows.length - 1].created_at;
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    };

    init();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
          // DB 읽음 처리 + broadcast로 상대방에게 즉시 통보
          supabase.rpc('mark_messages_read', { p_room_id: roomId }).then(() => {
            const now = new Date().toISOString();
            channel.send({
              type: 'broadcast',
              event: 'read_receipt',
              payload: { sender_id: userIdRef.current, last_read_at: now },
            });
          });
        }
      )
      // broadcast: 상대방이 보낸 읽음 이벤트 수신 (postgres_changes보다 훨씬 빠름)
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        if (payload.sender_id !== userIdRef.current) {
          setPartnerLastReadAt(payload.last_read_at);
        }
      })
      // fallback: chat_room_members UPDATE (입장 시 등)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_room_members', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as { user_id: string; last_read_at: string };
          if (updated.user_id === partnerUserIdRef.current) {
            setPartnerLastReadAt(updated.last_read_at);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestCreatedAt.current) return;
    setLoadingMore(true);

    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('room_id', roomId)
      .lt('created_at', oldestCreatedAt.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    const rows = data ?? [];
    if (rows.length > 0) {
      oldestCreatedAt.current = rows[rows.length - 1].created_at;
      setMessages(prev => [...prev, ...rows]);
    }
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, roomId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !userId) return;

    setInput('');
    setSending(true);
    const { data } = await supabase
      .from('messages')
      .insert({ room_id: roomId, sender_id: userId, content: text })
      .select('id, sender_id, content, created_at')
      .single();

    // realtime 이벤트 기다리지 않고 바로 표시
    if (data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [data, ...prev];
      });
      // 상대방에게 푸시 알림 (fire-and-forget)
      if (partner) {
        supabase.functions.invoke('notify-new-message', {
          body: { to_user_id: partner.partner_user_id, room_id: roomId },
        }).catch(() => {});
      }
    }
    setSending(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => partner && router.push({ pathname: '/profile/[id]', params: { id: partner.partner_user_id } })}
          disabled={!partner}
        >
          <Text style={styles.headerNickname}>
            {partner
              ? `${partner.partner_nickname}${partner.partner_birth_year ? ` · ${new Date().getFullYear() - partner.partner_birth_year}세` : ''}`
              : '채팅'}
          </Text>
          {partner?.partner_company_name && (
            <Text style={styles.headerCompany}>{partner.partner_company_name}</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        inverted
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.loadingMore} /> : null
        }
        renderItem={({ item }) => {
          const isMine = item.sender_id === userId;
          const isRead = isMine && partnerLastReadAt !== null &&
            new Date(item.created_at) <= new Date(partnerLastReadAt);

          return (
            <View style={isMine ? styles.rowMine : styles.rowOther}>
              {isMine && (
                <Text style={styles.readLabel}>
                  {isRead ? '읽음' : '1'}
                </Text>
              )}
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          placeholderTextColor={Colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { marginRight: 4, padding: 4 },
  headerInfo: { flex: 1 },
  headerNickname: { fontSize: 16, fontWeight: '600', color: Colors.text },
  headerCompany: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  messageList: { padding: 16, gap: 8 },
  loadingMore: { paddingVertical: 12 },
  rowMine: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 4 },
  rowOther: { flexDirection: 'row', justifyContent: 'flex-start' },
  readLabel: { fontSize: 11, color: Colors.primary, marginBottom: 2 },
  bubble: {
    maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextOther: { color: Colors.text },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: Colors.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendButton: {
    height: 40, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.border },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
