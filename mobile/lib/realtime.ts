import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, ChatMessage } from './api';

export function connectCustomerRealtime(handlers: {
  onMessageCreated?: (message: ChatMessage) => void;
  onSessionUpdated?: (session: { id: string; status: 'open' | 'closed' }) => void;
}) {
  const socket = io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
  });

  if (handlers.onMessageCreated) socket.on('message.created', handlers.onMessageCreated);
  if (handlers.onSessionUpdated) socket.on('session.updated', handlers.onSessionUpdated);

  return socket;
}

export function joinSession(socket: Socket, sessionId: string) {
  const emitJoin = () => socket.emit('session.join', { sessionId });
  if (socket.connected) emitJoin();
  socket.on('connect', emitJoin);
}
