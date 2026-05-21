import { FlatList, Image, Text, View } from 'react-native';
import { ChatMessage } from '../types';

function formatTimestamp(value: unknown) {
  if (!value || typeof value !== 'object' || !('toDate' in (value as Record<string, unknown>))) return '';
  const date = (value as { toDate: () => Date }).toDate();
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function ChatMessageList({
  listRef,
  messages,
  customerName,
}: {
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  messages: ChatMessage[];
  customerName: string;
}) {
  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
      renderItem={({ item }) => (
        <View
          style={{
            padding: 12,
            borderRadius: 14,
            maxWidth: '85%',
            alignSelf: item.senderType === 'customer' ? 'flex-end' : 'flex-start',
            backgroundColor: item.senderType === 'customer' ? '#4f46e5' : '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', marginBottom: 6, color: '#374151' }}>
            {item.senderType === 'customer' ? customerName : 'Admin'}
          </Text>
          {item.messageType === 'image' && item.imageUrl ? (
            <>
              <Image source={{ uri: item.imageUrl }} style={{ width: 180, height: 180, borderRadius: 12 }} />
              <Text style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>Ảnh</Text>
            </>
          ) : (
            <Text style={{ color: '#111827' }}>{item.text || ''}</Text>
          )}
          <Text style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>{formatTimestamp(item.createdAt)}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 12 }}>Chưa có tin nhắn nào.</Text>}
    />
  );
}
