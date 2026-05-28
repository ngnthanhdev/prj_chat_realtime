import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChatMessageList } from './components/chat-message-list';
import { createCustomerSession, listCustomerMessages, sendCustomerImageMessage, sendCustomerTextMessage } from './lib/api';
import { connectCustomerRealtime, joinSession } from './lib/realtime';
import { ChatMessage } from './types';

export default function App() {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const socketRef = useRef<Socket | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId || !customerToken) return;

    void refreshMessages(sessionId, customerToken);

    const socket = connectCustomerRealtime({
      onMessageCreated: (message) => {
        if (message.sessionId === sessionId) {
          setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
        }
      },
      onSessionUpdated: (session) => {
        if (session.id === sessionId && session.status === 'closed') {
          setError('Session này đã được admin đóng.');
        }
      },
    });

    socketRef.current = socket;
    joinSession(socket, sessionId);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, customerToken]);

  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const title = useMemo(() => (sessionId ? `Khách hàng: ${customerName}` : 'Bắt đầu cuộc trò chuyện'), [customerName, sessionId]);

  const refreshMessages = async (nextSessionId: string, nextCustomerToken: string) => {
    try {
      const nextMessages = await listCustomerMessages(nextSessionId, nextCustomerToken);
      setMessages(nextMessages);
      setError(null);
    } catch {
      setError('Không tải được tin nhắn.');
    }
  };

  const handleStartChat = async () => {
    const trimmed = customerName.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const session = await createCustomerSession(trimmed);
      setSessionId(session.sessionId);
      setCustomerToken(session.customerToken);
      setReady(true);
    } catch {
      setError('Không thể tạo phiên chat. Hãy kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !customerToken || !draft.trim()) return;

    try {
      setSendingText(true);
      setError(null);
      await sendCustomerTextMessage(sessionId, customerToken, draft);
      setDraft('');
      await refreshMessages(sessionId, customerToken);
    } catch {
      setError('Không gửi được tin nhắn.');
    } finally {
      setSendingText(false);
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
      setPreviewImage(result.assets[0].uri);
    } catch {
      setError('Không chọn được ảnh.');
    }
  };

  const handleConfirmImage = async () => {
    if (!sessionId || !customerToken || !previewImage) return;
    try {
      setSendingImage(true);
      setError(null);
      await sendCustomerImageMessage(sessionId, customerToken, previewImage, draft);
      setDraft('');
      setPreviewImage(null);
      await refreshMessages(sessionId, customerToken);
    } catch {
      setError('Không gửi được ảnh.');
    } finally {
      setSendingImage(false);
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
              <ChatMessageList listRef={listRef} messages={messages} customerName={customerName} />

              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Nhập tin nhắn"
                  style={[styles.input, styles.composerInput]}
                  editable={!sendingText && !sendingImage}
                />
                <Pressable style={styles.imageButton} onPress={handlePickImage} disabled={sendingText || sendingImage}>
                  <Text style={styles.primaryButtonText}>{sendingImage ? 'Đang gửi...' : 'Ảnh'}</Text>
                </Pressable>
                <Pressable style={styles.sendButton} onPress={handleSendMessage} disabled={sendingText || sendingImage}>
                  <Text style={styles.primaryButtonText}>{sendingText ? 'Đang gửi...' : 'Gửi'}</Text>
                </Pressable>
              </View>

              <Modal visible={!!previewImage} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalCard}>
                    <Text style={styles.label}>Xem trước ảnh</Text>
                    {previewImage ? <Image source={{ uri: previewImage }} style={styles.previewImage} /> : null}
                    <View style={styles.modalActions}>
                      <Pressable style={styles.secondaryActionButton} onPress={() => setPreviewImage(null)}>
                        <Text>Hủy</Text>
                      </Pressable>
                      <Pressable style={styles.primaryButton} onPress={handleConfirmImage} disabled={sendingImage}>
                        <Text style={styles.primaryButtonText}>{sendingImage ? 'Đang gửi...' : 'Gửi ảnh'}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Modal>
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
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
  errorText: {
    color: '#dc2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
});
