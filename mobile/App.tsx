import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { firebaseApp } from './lib/firebase';
import { ensureAnonymousUser } from './lib/auth';
import { createChatSession, sendImageMessage, sendTextMessage, subscribeMessages } from './lib/chat';
import { ChatMessage } from './types';

void firebaseApp;

export default function App() {
  const [customerName, setCustomerName] = useState('');
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    return subscribeMessages(sessionId, setMessages);
  }, [sessionId]);

  const title = useMemo(() => (sessionId ? `Khách hàng: ${customerName}` : 'Bắt đầu cuộc trò chuyện'), [customerName, sessionId]);

  const handleStartChat = async () => {
    const trimmed = customerName.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await ensureAnonymousUser();
      const newSessionId = await createChatSession(trimmed, user.uid);
      setSessionId(newSessionId);
      setReady(true);
    } catch (err) {
      setError('Không thể tạo phiên chat. Hãy kiểm tra Firebase config.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !draft.trim()) return;

    try {
      await sendTextMessage(sessionId, draft);
      setDraft('');
    } catch (err) {
      setError('Không gửi được tin nhắn.');
    }
  };

  const handlePickImage = async () => {
    if (!sessionId) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;
      await sendImageMessage(sessionId, result.assets[0].uri);
    } catch (err) {
      setError('Không gửi được ảnh.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {!ready ? (
            <View style={styles.form}>
              <Text style={styles.label}>Tên khách hàng</Text>
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Nhập tên của bạn"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleStartChat} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Bắt đầu chat</Text>}
              </Pressable>
            </View>
          ) : (
            <>
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.messageBubble,
                      item.senderType === 'customer' ? styles.customerBubble : styles.adminBubble,
                    ]}
                  >
                    <Text style={styles.messageSender}>{item.senderType === 'customer' ? customerName : 'Admin'}</Text>
                    {item.messageType === 'image' && item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                    ) : (
                      <Text style={styles.messageText}>{item.text || ''}</Text>
                    )}
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text>}
              />

              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Nhập tin nhắn"
                  style={[styles.input, styles.composerInput]}
                />
                <Pressable style={styles.imageButton} onPress={handlePickImage}>
                  <Text style={styles.primaryButtonText}>Ảnh</Text>
                </Pressable>
                <Pressable style={styles.sendButton} onPress={handleSendMessage}>
                  <Text style={styles.primaryButtonText}>Gửi</Text>
                </Pressable>
              </View>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  messageList: {
    gap: 12,
    paddingVertical: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '85%',
  },
  customerBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f46e5',
  },
  adminBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    color: '#374151',
  },
  messageText: {
    color: '#111827',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  composerInput: {
    flex: 1,
  },
  imageButton: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#dc2626',
  },
});
