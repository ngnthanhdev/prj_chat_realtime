import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, ChatMessage, ChatSession } from './api';

export function connectAdminRealtime(handlers: {
  onMessageCreated?: (message: ChatMessage) => void;
  onSessionUpdated?: (session: ChatSession) => void;
  onSessionCreated?: (session: ChatSession) => void;
}) {
  const socket = io(API_BASE_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  if (handlers.onMessageCreated) socket.on('message.created', handlers.onMessageCreated);
  if (handlers.onSessionUpdated) socket.on('session.updated', handlers.onSessionUpdated);
  if (handlers.onSessionCreated) socket.on('session.created', handlers.onSessionCreated);

  return socket;
}

export function joinSession(socket: Socket, sessionId: string) {
  const emitJoin = () => socket.emit('session.join', { sessionId });
  if (socket.connected) emitJoin();
  socket.on('connect', emitJoin);
}
