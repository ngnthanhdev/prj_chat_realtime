import { ChatMessage } from '@/types';

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
  messages,
  customerName,
  endRef,
}: {
  messages: ChatMessage[];
  customerName: string;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: '#fff',
        borderRadius: 16,
        padding: 20,
        minHeight: 420,
        overflowY: 'auto',
      }}
    >
      {messages.map((message) => (
        <div
          key={message.id}
          style={{ display: 'flex', justifyContent: message.senderType === 'admin' ? 'flex-end' : 'flex-start' }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              maxWidth: '70%',
              background: message.senderType === 'admin' ? '#4f46e5' : '#e5e7eb',
              color: message.senderType === 'admin' ? '#fff' : '#111827',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {message.senderType === 'admin' ? 'Admin' : customerName}
            </div>
            {message.messageType === 'image' && message.imageUrl ? (
              <img src={message.imageUrl} alt="chat image" style={{ width: 220, height: 220, objectFit: 'cover', borderRadius: 12 }} />
            ) : (
              <div>{message.text || ''}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75 }}>{formatTimestamp(message.createdAt)}</div>
          </div>
        </div>
      ))}
      {!messages.length ? <p style={{ color: '#6b7280' }}>Chưa có tin nhắn trong phiên này.</p> : null}
      <div ref={endRef} />
    </div>
  );
}
