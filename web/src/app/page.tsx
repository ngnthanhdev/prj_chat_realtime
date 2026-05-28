'use client';

import { ChangeEvent, CSSProperties, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  closeSession,
  listMessages,
  listSessions,
  sendAdminImageMessage,
  sendAdminTextMessage,
} from '@/lib/api';
import { ChatMessage, ChatSession } from '@/types';
import { connectAdminRealtime, joinSession } from '@/lib/realtime';

const avatarColors = ['#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#f97316', '#64748b'];

function formatTimestamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'DM';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function colorFor(value: string) {
  let sum = 0;
  for (const char of value) sum += char.charCodeAt(0);
  return avatarColors[sum % avatarColors.length];
}

export default function HomePage() {
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'upload' | 'close' | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );
  const canSend = Boolean(activeSessionId && activeSession?.status !== 'closed' && (draft.trim() || previewFile));

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) =>
      [session.customerName, session.lastMessage ?? '', session.status].some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, sessions]);

  useEffect(() => {
    void refreshSessions();

    const socket = connectAdminRealtime({
      onMessageCreated: (message) => {
        if (message.sessionId === activeSessionId) {
          setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
        }
      },
      onSessionUpdated: (session) => {
        setSessions((prev) => {
          const exists = prev.some((item) => item.id === session.id);
          if (!exists) return prev;
          return prev.map((item) => (item.id === session.id ? { ...item, ...session } : item));
        });
      },
      onSessionCreated: (session) => {
        setSessions((prev) => (prev.some((item) => item.id === session.id) ? prev : [session, ...prev]));
      },
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    if (socketRef.current) joinSession(socketRef.current, activeSessionId);
    void refreshMessages(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const refreshSessions = async () => {
    try {
      setLoadingSessions(true);
      const nextSessions = await listSessions();
      setSessions(nextSessions);
      setError(null);
      if (!activeSessionId && nextSessions[0]) setActiveSessionId(nextSessions[0].id);
    } catch {
      setError('Không tải được danh sách direct message.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const refreshMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true);
      const nextMessages = await listMessages(sessionId);
      setMessages(nextMessages);
      setError(null);
    } catch {
      setError('Không tải được tin nhắn.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!canSend || !activeSessionId) return;
    try {
      setBusy(previewFile ? 'upload' : 'send');
      setError(null);
      if (previewFile) {
        await sendAdminImageMessage(activeSessionId, previewFile, draft);
        handleCancelPreview();
      } else {
        await sendAdminTextMessage(activeSessionId, draft);
      }
      setDraft('');
      await refreshMessages(activeSessionId);
      await refreshSessions();
    } catch {
      setError('Không gửi được tin nhắn admin.');
    } finally {
      setBusy(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
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
      await closeSession(activeSessionId);
      await refreshSessions();
      await refreshMessages(activeSessionId);
    } catch {
      setError('Không đóng được session.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.neighborhoodHeader}>
          <div style={styles.neighborhoodIcon}>DM</div>
          <div>
            <div style={styles.neighborhoodName}>Realtime Support</div>
            <div style={styles.activeLine}>
              <span style={styles.onlineDot} />
              <span>{sessions.filter((session) => session.status === 'open').length} direct messages open</span>
            </div>
          </div>
        </div>

        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search DMs..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.dmSectionHeader}>
          <button type="button" style={styles.sectionToggle}>
            <span>⌄</span>
            <span>Direct Messages</span>
          </button>
          <button type="button" style={styles.iconButton} title="New direct message">
            +
          </button>
        </div>

        <div style={styles.sessionList}>
          {loadingSessions ? <p style={styles.sidebarMuted}>Đang tải direct messages...</p> : null}
          {!loadingSessions && !filteredSessions.length ? (
            <p style={styles.sidebarMuted}>Chưa có direct message nào.</p>
          ) : null}
          {filteredSessions.map((session) => {
            const active = session.id === activeSessionId;
            const init = initials(session.customerName);
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setActiveSessionId(session.id)}
                style={{
                  ...styles.dmItem,
                  ...(active ? styles.dmItemActive : null),
                }}
              >
                <span style={styles.avatarShell}>
                  <span style={{ ...styles.avatar, background: colorFor(session.customerName) }}>{init}</span>
                  {session.status === 'open' ? <span style={styles.avatarOnline} /> : null}
                </span>
                <span style={styles.dmBody}>
                  <span style={styles.dmTopLine}>
                    <span style={{ ...styles.dmName, fontWeight: session.lastMessage ? 700 : 500 }}>{session.customerName}</span>
                    <span style={styles.dmTime}>{formatTimestamp(session.lastMessageAt ?? session.updatedAt)}</span>
                  </span>
                  <span style={styles.dmPreview}>{session.lastMessage || 'Chưa có tin nhắn'}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={styles.sidebarFooter}>
          <span style={styles.adminAvatar}>AD</span>
          <span style={styles.adminMeta}>
            <span style={styles.adminName}>Admin</span>
            <span style={styles.sidebarMuted}>Realtime dashboard</span>
          </span>
          <button type="button" style={styles.bellButton} title="Notifications">
            ◦
          </button>
        </div>
      </aside>

      <section style={styles.chatPanel}>
        {activeSession ? (
          <>
            <header style={styles.chatHeader}>
              <span style={{ ...styles.headerAvatar, background: colorFor(activeSession.customerName) }}>
                {initials(activeSession.customerName)}
              </span>
              <span style={styles.headerText}>
                <span style={styles.headerName}>{activeSession.customerName}</span>
                <span style={{ ...styles.headerStatus, color: activeSession.status === 'open' ? '#10b981' : '#8c7b6e' }}>
                  {activeSession.status === 'open' ? 'Active now' : 'Closed session'}
                </span>
              </span>
              <span style={styles.headerActions}>
                <button type="button" style={styles.headerIconButton} title="Call">
                  ☎
                </button>
                <button type="button" style={styles.headerIconButton} title="Info">
                  i
                </button>
                <button
                  type="button"
                  style={{ ...styles.closeButton, opacity: activeSession.status === 'closed' ? 0.6 : 1 }}
                  onClick={handleCloseSession}
                  disabled={busy === 'close' || activeSession.status === 'closed'}
                  title="Close session"
                >
                  {busy === 'close' ? '...' : '×'}
                </button>
              </span>
            </header>

            <div style={styles.messagesPane}>
              <div style={styles.dateDivider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>Today</span>
                <span style={styles.dividerLine} />
              </div>

              {loadingMessages ? <p style={styles.emptyText}>Đang tải tin nhắn...</p> : null}
              {!loadingMessages && !messages.length ? (
                <div style={styles.emptyState}>
                  <span style={{ ...styles.emptyAvatar, background: colorFor(activeSession.customerName) }}>
                    {initials(activeSession.customerName)}
                  </span>
                  <h2 style={styles.emptyTitle}>{activeSession.customerName}</h2>
                  <p style={styles.emptyText}>Bắt đầu trả lời direct message của khách hàng này.</p>
                </div>
              ) : null}

              {messages.map((message, index) => {
                const isMe = message.senderType === 'admin';
                const previous = messages[index - 1];
                const next = messages[index + 1];
                const firstInGroup = previous?.senderType !== message.senderType;
                const lastInGroup = next?.senderType !== message.senderType;
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isMe={isMe}
                    firstInGroup={firstInGroup}
                    lastInGroup={lastInGroup}
                    customerName={activeSession.customerName}
                  />
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {previewUrl ? (
              <div style={styles.previewStrip}>
                <div style={styles.previewCard}>
                  <img src={previewUrl} alt="preview" style={styles.previewImage} />
                  <button type="button" style={styles.previewClose} onClick={handleCancelPreview} title="Cancel image">
                    ×
                  </button>
                </div>
              </div>
            ) : null}

            <div style={styles.composerArea}>
              <label style={styles.imageButton} title="Send image">
                +
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={busy === 'send' || busy === 'upload' || activeSession.status === 'closed'}
                />
              </label>
              <div style={styles.textPill}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeSession.status === 'closed' ? 'Session này đã đóng' : 'Aa'}
                  rows={1}
                  style={styles.textarea}
                  disabled={busy === 'send' || busy === 'upload' || activeSession.status === 'closed'}
                />
                <button type="button" style={styles.emojiButton} title="Emoji">
                  ☺
                </button>
              </div>
              <button
                type="button"
                style={{
                  ...styles.sendButton,
                  ...(!canSend ? styles.sendButtonDisabled : null),
                }}
                onClick={handleSend}
                disabled={busy === 'send' || busy === 'upload' || !canSend}
                title="Send"
              >
                {busy === 'send' || busy === 'upload' ? '…' : '➤'}
              </button>
            </div>

            {error ? <p style={styles.error}>{error}</p> : null}
          </>
        ) : (
          <div style={styles.noConversation}>
            <span style={styles.noConversationIcon}>DM</span>
            <h1 style={styles.emptyTitle}>Chọn một direct message</h1>
            <p style={styles.emptyText}>Danh sách bên trái chỉ hiển thị direct messages, không có channel.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function MessageBubble({
  message,
  isMe,
  firstInGroup,
  lastInGroup,
  customerName,
}: {
  message: ChatMessage;
  isMe: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  customerName: string;
}) {
  return (
    <div style={{ ...styles.messageRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
      {!isMe && lastInGroup ? (
        <span style={{ ...styles.messageAvatar, background: colorFor(customerName) }}>{initials(customerName)}</span>
      ) : (
        !isMe && <span style={styles.messageAvatarSpacer} />
      )}
      <div style={{ ...styles.messageCluster, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {firstInGroup ? <span style={styles.messageAuthor}>{isMe ? 'You' : customerName}</span> : null}
        <div
          style={{
            ...styles.bubble,
            ...(isMe ? styles.myBubble : styles.theirBubble),
            borderBottomRightRadius: isMe && !lastInGroup ? 8 : 22,
            borderBottomLeftRadius: !isMe && !lastInGroup ? 8 : 22,
          }}
        >
          {message.messageType === 'image' && message.imageUrl ? (
            <>
              <img src={message.imageUrl} alt="chat image" style={styles.chatImage} />
              {message.text ? <span style={styles.imageCaption}>{message.text}</span> : null}
            </>
          ) : (
            <span>{message.text || ''}</span>
          )}
        </div>
        {lastInGroup ? <span style={styles.messageTime}>{formatTimestamp(message.createdAt)}</span> : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: '#faf8f5',
    color: '#2c1a0e',
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif",
  },
  sidebar: {
    width: 280,
    height: '100%',
    flexShrink: 0,
    background: '#2c1a0e',
    color: '#faf8f5',
    display: 'flex',
    flexDirection: 'column',
  },
  neighborhoodHeader: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    padding: '16px 16px 14px',
    borderBottom: '1px solid rgba(250,248,245,0.1)',
  },
  neighborhoodIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: '#c8561e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
  },
  neighborhoodName: {
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  activeLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    color: 'rgba(250,248,245,0.62)',
    fontSize: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#34d399',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '12px 12px 8px',
    padding: '8px 11px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    color: 'rgba(250,248,245,0.48)',
    fontSize: 17,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: 'rgba(250,248,245,0.78)',
    fontSize: 13,
  },
  dmSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px 4px',
  },
  sectionToggle: {
    border: 0,
    background: 'transparent',
    color: 'rgba(250,248,245,0.52)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: 11,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    padding: '6px 2px',
  },
  iconButton: {
    width: 24,
    height: 24,
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: 'rgba(250,248,245,0.48)',
    cursor: 'pointer',
    fontSize: 17,
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 8px 12px',
    scrollbarWidth: 'none',
  },
  sidebarMuted: {
    color: 'rgba(250,248,245,0.46)',
    fontSize: 12,
    margin: '8px 8px',
  },
  dmItem: {
    width: '100%',
    border: 0,
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRadius: 10,
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 8px',
    color: '#faf8f5',
    textAlign: 'left',
    cursor: 'pointer',
  },
  dmItemActive: {
    background: 'rgba(200,86,30,0.25)',
    borderLeftColor: '#c8561e',
  },
  avatarShell: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
  },
  avatarOnline: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#34d399',
    border: '2px solid #2c1a0e',
  },
  dmBody: {
    minWidth: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  dmTopLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dmName: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'rgba(250,248,245,0.82)',
    fontSize: 13,
  },
  dmTime: {
    color: 'rgba(250,248,245,0.38)',
    fontSize: 10,
    flexShrink: 0,
  },
  dmPreview: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'rgba(250,248,245,0.46)',
    fontSize: 11,
  },
  sidebarFooter: {
    borderTop: '1px solid rgba(250,248,245,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#c8561e',
    fontSize: 12,
    fontWeight: 800,
    color: '#fff',
  },
  adminMeta: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  adminName: {
    color: '#faf8f5',
    fontSize: 13,
    fontWeight: 700,
  },
  bellButton: {
    width: 28,
    height: 28,
    border: 0,
    borderRadius: 999,
    background: 'transparent',
    color: 'rgba(250,248,245,0.5)',
    fontSize: 22,
  },
  chatPanel: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#faf8f5',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 18px',
    background: '#fff',
    borderBottom: '1px solid rgba(44,26,14,0.1)',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  headerName: {
    color: '#2c1a0e',
    fontSize: 15,
    fontWeight: 800,
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: 700,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    border: 0,
    borderRadius: 999,
    background: 'transparent',
    color: '#c8561e',
    cursor: 'pointer',
    fontSize: 17,
  },
  closeButton: {
    width: 36,
    height: 36,
    border: 0,
    borderRadius: 999,
    background: 'rgba(200,86,30,0.12)',
    color: '#c8561e',
    cursor: 'pointer',
    fontSize: 20,
  },
  messagesPane: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 18px 18px',
    scrollbarWidth: 'none',
  },
  dateDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '12px 0 18px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(44,26,14,0.1)',
  },
  dividerText: {
    color: '#8c7b6e',
    fontSize: 11,
    fontWeight: 800,
  },
  emptyState: {
    minHeight: 260,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
  },
  emptyTitle: {
    margin: 0,
    color: '#2c1a0e',
    fontSize: 19,
    fontWeight: 800,
  },
  emptyText: {
    color: '#8c7b6e',
    fontSize: 14,
    margin: 0,
  },
  messageRow: {
    display: 'flex',
    gap: 8,
    marginTop: 3,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    alignSelf: 'flex-end',
  },
  messageAvatarSpacer: {
    width: 28,
    flexShrink: 0,
  },
  messageCluster: {
    maxWidth: 'min(70%, 720px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  messageAuthor: {
    color: '#8c7b6e',
    fontSize: 11,
    fontWeight: 700,
    padding: '0 10px',
  },
  bubble: {
    borderRadius: 22,
    padding: '9px 13px',
    fontSize: 14,
    lineHeight: 1.45,
    overflowWrap: 'anywhere',
  },
  myBubble: {
    background: '#c8561e',
    color: '#fff',
  },
  theirBubble: {
    background: '#fff',
    color: '#2c1a0e',
    boxShadow: '0 1px 2px rgba(44,26,14,0.06)',
  },
  chatImage: {
    display: 'block',
    width: 220,
    height: 220,
    objectFit: 'cover',
    borderRadius: 16,
  },
  imageCaption: {
    display: 'block',
    marginTop: 8,
    whiteSpace: 'pre-wrap',
  },
  messageTime: {
    color: '#8c7b6e',
    fontSize: 10,
    padding: '0 10px 5px',
  },
  previewStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 18px 0',
  },
  previewCard: {
    position: 'relative',
    display: 'inline-block',
  },
  previewImage: {
    width: 112,
    height: 90,
    borderRadius: 16,
    objectFit: 'cover',
    border: '1px solid rgba(44,26,14,0.1)',
  },
  previewClose: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    border: 0,
    borderRadius: 999,
    background: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
  },
  composerArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 18px 18px',
  },
  imageButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 999,
    border: 0,
    background: 'rgba(200,86,30,0.12)',
    color: '#c8561e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 24,
    fontWeight: 500,
  },
  textPill: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    padding: '8px 12px 8px 16px',
    borderRadius: 999,
    border: '1px solid rgba(44,26,14,0.1)',
    background: '#fff',
  },
  textarea: {
    flex: 1,
    minWidth: 0,
    resize: 'none',
    outline: 'none',
    border: 0,
    background: 'transparent',
    color: '#2c1a0e',
    font: 'inherit',
    fontSize: 14,
    lineHeight: '22px',
    maxHeight: 88,
  },
  emojiButton: {
    border: 0,
    background: 'transparent',
    color: '#8c7b6e',
    cursor: 'pointer',
    fontSize: 18,
  },
  sendButton: {
    width: 38,
    height: 38,
    border: 0,
    borderRadius: 999,
    background: '#c8561e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
  },
  sendButtonDisabled: {
    background: '#ede8e1',
    color: '#8c7b6e',
    cursor: 'not-allowed',
  },
  error: {
    color: '#b91c1c',
    margin: '0 18px 12px',
    fontSize: 13,
  },
  noConversation: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noConversationIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: '#c8561e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 900,
  },
};
