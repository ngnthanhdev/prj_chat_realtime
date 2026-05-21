import { ChatSession } from '@/types';

export function ChatSessionList({
  sessions,
  activeSessionId,
  loading,
  onSelect,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  onSelect: (sessionId: string) => void;
}) {
  if (loading) return <p style={{ color: '#6b7280' }}>Đang tải danh sách chat...</p>;
  if (!sessions.length) return <p style={{ color: '#6b7280' }}>Chưa có phiên chat nào.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sessions.map((session) => (
        <button
          key={session.id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: 14,
            background: session.id === activeSessionId ? '#eef2ff' : '#f9fafb',
            borderColor: session.id === activeSessionId ? '#4f46e5' : '#e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            cursor: 'pointer',
          }}
          onClick={() => onSelect(session.id)}
        >
          <strong>{session.customerName}</strong>
          <span style={{ color: '#6b7280', fontSize: 13, textAlign: 'left' }}>{session.lastMessage || 'Chưa có tin nhắn'}</span>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Trạng thái: {session.status}</span>
        </button>
      ))}
    </div>
  );
}
