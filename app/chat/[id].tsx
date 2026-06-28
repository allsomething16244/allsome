import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatRoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      setMessages(data ?? []);
      setLoading(false);
    };

    init();

    // Realtime 구독
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !userId) return;

    setInput('');
    setSending(true);
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: text,
    });
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
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>채팅</Text>
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMine = item.sender_id === userId;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                {item.content}
              </Text>
            </View>
          );
        }}
      />

      {/* 입력창 */}
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
  backButton: { marginRight: 12, padding: 4 },
  backText: { fontSize: 22, color: Colors.primary },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  messageList: { padding: 16, gap: 8 },
  bubble: {
    maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
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
