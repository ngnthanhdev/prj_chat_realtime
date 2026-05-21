'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, hasAdminClaim, signInAdmin, signOutAdmin } from '@/lib/auth';
import { closeChatSession, sendAdminImageMessage, sendAdminTextMessage, subscribeMessages, subscribeSessions } from '@/lib/chat';
import { ChatMessage, ChatSession } from '@/types';
import { ChatSessionList } from '@/components/chat-session-list';
import { ChatMessageList } from '@/components/chat-message-list';

export default function HomePage() {
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'login' | 'send' | 'upload' | 'close' | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setError(null);

      if (!nextUser) {
        setIsAdmin(false);
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);
      try {
        const admin = await hasAdminClaim(nextUser);
        setIsAdmin(admin);
        if (!admin) setError('Tài khoản này chưa được cấp quyền admin.');
      } catch {
        setIsAdmin(false);
        setError('Không kiểm tra được quyền admin.');
      } finally {
        setCheckingRole(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    setLoadingSessions(true);
    const unsubscribe = subscribeSessions((nextSessions) => {
      setSessions(nextSessions);
      setLoadingSessions(false);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!activeSessionId || !isAdmin) {
      setMessages([]);
      return;
    }
    return subscribeMessages(activeSessionId, setMessages);
  }, [activeSessionId, isAdmin]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const handleLogin = async () => {
    try {
      setBusy('login');
      setError(null);
      await signInAdmin();
    } catch {
      setError('Đăng nhập thất bại.');
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    if (!activeSessionId || !draft.trim()) return;
    try {
      setBusy('send');
      setError(null);
      await sendAdminTextMessage(activeSessionId, draft);
      setDraft('');
    } catch {
      setError('Không gửi được tin nhắn admin.');
    } finally {
      setBusy(null);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!activeSessionId || !file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleSendPreviewImage = async () => {
    if (!activeSessionId || !previewFile) return;
    try {
      setBusy('upload');
      setError(null);
      await sendAdminImageMessage(activeSessionId, previewFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewFile(null);
      setPreviewUrl(null);
    } catch {
      setError('Không gửi được ảnh admin.');
    } finally {
      setBusy(null);
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleCloseSession = async () => {
    if (!activeSessionId) return;
    try {
      setBusy('close');
      setError(null);
      await closeChatSession(activeSessionId);
    } catch {
      setError('Không đóng được session.');
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <main style={styles.centeredPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>Realtime Chat Admin</h1>
          <p style={styles.muted}>Đăng nhập bằng Google để vào màn trả lời chat.</p>
          <button style={styles.primaryButton} onClick={handleLogin} disabled={busy === 'login'}>
            {busy === 'login' ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
          </button>
          {error ? <p style={styles.error}>{error}</p> : null}
        </div>
      </main>
    );
  }

  if (checkingRole) {
    return (
      <main style={styles.centeredPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>Đang kiểm tra quyền</h1>
          <p style={styles.muted}>Chờ một chút, mình đang kiểm tra admin claim.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={styles.centeredPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>Chưa có quyền admin</h1>
          <p style={styles.muted}>Tài khoản này đã đăng nhập nhưng chưa được cấp claim `admin: true`.</p>
          <div style={styles.actionRow}>
            <button style={styles.secondaryButton} onClick={() => signOutAdmin()}>
              Đăng xuất
            </button>
          </div>
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

        <ChatSessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          loading={loadingSessions}
          onSelect={setActiveSessionId}
        />
      </aside>

      <section style={styles.chatPanel}>
        {activeSession ? (
          <>
            <div style={styles.chatHeader}>
              <div>
                <h2 style={styles.subtitle}>{activeSession.customerName}</h2>
                <p style={styles.muted}>Session: {activeSession.id}</p>
                <p style={styles.muted}>Trạng thái: {activeSession.status}</p>
              </div>
              <button style={styles.closeButton} onClick={handleCloseSession} disabled={busy === 'close' || activeSession.status === 'closed'}>
                {busy === 'close' ? 'Đang đóng...' : activeSession.status === 'closed' ? 'Đã đóng' : 'Đóng session'}
              </button>
            </div>

            <ChatMessageList messages={messages} customerName={activeSession.customerName} endRef={messageEndRef} />

            {previewUrl ? (
              <div style={styles.previewPanel}>
                <div>
                  <div style={styles.previewTitle}>Ảnh sắp gửi</div>
                  <img src={previewUrl} alt="preview" style={styles.previewImage as React.CSSProperties} />
                </div>
                <div style={styles.previewActions}>
                  <button style={styles.secondaryButton} onClick={handleCancelPreview} disabled={busy === 'upload'}>
                    Hủy
                  </button>
                  <button style={styles.primaryButton} onClick={handleSendPreviewImage} disabled={busy === 'upload'}>
                    {busy === 'upload' ? 'Đang tải ảnh...' : 'Gửi ảnh'}
                  </button>
                </div>
              </div>
            ) : null}

            <div style={styles.composer}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nhập tin nhắn trả lời"
                style={styles.input}
                disabled={busy === 'send' || busy === 'upload' || activeSession.status === 'closed'}
              />
              <label style={styles.fileButton}>
                Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={busy === 'send' || busy === 'upload' || activeSession.status === 'closed'}
                />
              </label>
              <button style={styles.primaryButton} onClick={handleSend} disabled={busy === 'send' || busy === 'upload' || activeSession.status === 'closed'}>
                {busy === 'send' ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
            {activeSession.status === 'closed' ? <p style={styles.muted}>Session này đã đóng, chỉ còn xem lịch sử.</p> : null}
            {error ? <p style={styles.error}>{error}</p> : null}
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
  actionRow: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
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
  closeButton: {
    border: 'none',
    borderRadius: 12,
    background: '#b91c1c',
    color: '#fff',
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  fileButton: {
    borderRadius: 12,
    background: '#0f766e',
    color: '#fff',
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
  },
  previewPanel: {
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontWeight: 700,
    marginBottom: 8,
  },
  previewImage: {
    width: 160,
    height: 160,
    objectFit: 'cover',
    borderRadius: 12,
  },
  previewActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
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
