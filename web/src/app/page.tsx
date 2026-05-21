'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInAdmin, signOutAdmin } from '@/lib/auth';
import { sendAdminTextMessage, subscribeMessages, subscribeSessions } from '@/lib/chat';
import { ChatMessage, ChatSession } from '@/types';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeSessions(setSessions);
  }, [user]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    return subscribeMessages(activeSessionId, setMessages);
  }, [activeSessionId]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const handleSend = async () => {
    if (!activeSessionId || !draft.trim()) return;
    try {
      await sendAdminTextMessage(activeSessionId, draft);
      setDraft('');
    } catch (err) {
      setError('Không gửi được tin nhắn admin.');
    }
  };

  if (!user) {
    return (
      <main style={styles.centeredPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>Realtime Chat Admin</h1>
          <p style={styles.muted}>Đăng nhập bằng Google để vào màn trả lời chat.</p>
          <button style={styles.primaryButton} onClick={() => signInAdmin().catch(() => setError('Đăng nhập thất bại.'))}>
            Đăng nhập với Google
          </button>
          {error ? <p style={styles.error}>{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div>
            <h1 style={styles.title}>Chats</h1>
            <p style={styles.muted}>{user.email || 'Admin'}</p>
          </div>
          <button style={styles.secondaryButton} onClick={() => signOutAdmin()}>
            Đăng xuất
          </button>
        </div>

        <div style={styles.sessionList}>
          {sessions.map((session) => (
            <button
              key={session.id}
              style={{
                ...styles.sessionItem,
                ...(session.id === activeSessionId ? styles.sessionItemActive : {}),
              }}
              onClick={() => setActiveSessionId(session.id)}
            >
              <strong>{session.customerName}</strong>
              <span style={styles.mutedSmall}>{session.lastMessage || 'Chưa có tin nhắn'}</span>
            </button>
          ))}
          {!sessions.length ? <p style={styles.muted}>Chưa có phiên chat nào.</p> : null}
        </div>
      </aside>

      <section style={styles.chatPanel}>
        {activeSession ? (
          <>
            <div style={styles.chatHeader}>
              <div>
                <h2 style={styles.subtitle}>{activeSession.customerName}</h2>
                <p style={styles.muted}>Session: {activeSession.id}</p>
              </div>
            </div>

            <div style={styles.messageList}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    ...styles.messageBubble,
                    ...(message.senderType === 'admin' ? styles.adminBubble : styles.customerBubble),
                  }}
                >
                  <div style={styles.messageSender}>{message.senderType === 'admin' ? 'Admin' : activeSession.customerName}</div>
                  <div>{message.text || ''}</div>
                </div>
              ))}
              {!messages.length ? <p style={styles.muted}>Chưa có tin nhắn trong phiên này.</p> : null}
            </div>

            <div style={styles.composer}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nhập tin nhắn trả lời"
                style={styles.input}
              />
              <button style={styles.primaryButton} onClick={handleSend}>
                Gửi
              </button>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <h2 style={styles.subtitle}>Chọn một cuộc chat</h2>
            <p style={styles.muted}>Danh sách bên trái sẽ hiện các khách hàng đang nhắn.</p>
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    minHeight: '100vh',
  },
  centeredPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  sidebar: {
    borderRight: '1px solid #e5e7eb',
    background: '#fff',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 28,
  },
  subtitle: {
    margin: 0,
    fontSize: 22,
  },
  muted: {
    color: '#6b7280',
  },
  mutedSmall: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'left',
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sessionItem: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 14,
    background: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    cursor: 'pointer',
  },
  sessionItemActive: {
    borderColor: '#4f46e5',
    background: '#eef2ff',
  },
  chatPanel: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  chatHeader: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  messageList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    minHeight: 420,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '70%',
  },
  customerBubble: {
    alignSelf: 'flex-start',
    background: '#e5e7eb',
  },
  adminBubble: {
    alignSelf: 'flex-end',
    background: '#4f46e5',
    color: '#fff',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  },
  composer: {
    display: 'flex',
    gap: 12,
    background: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  input: {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '12px 14px',
  },
  primaryButton: {
    border: 'none',
    borderRadius: 12,
    background: '#4f46e5',
    color: '#fff',
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: 12,
    background: '#fff',
    padding: '10px 12px',
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    marginTop: 12,
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
