import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Message, MessageType, ChatSessionStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';

type SessionRealtimePayload = {
  id: string;
  customerName: string;
  status: ChatSessionStatus;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string | null;
  lastMessageType: MessageType | null;
  lastMessageAt: Date | null;
};

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN?.split(',').map((item) => item.trim()) ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(_client: Socket) {
    return true;
  }

  @SubscribeMessage('session.join')
  async joinSession(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
    if (!body?.sessionId) return;
    await client.join(this.roomName(body.sessionId));
    client.emit('session.joined', { sessionId: body.sessionId });
  }

  broadcastMessageCreated(message: Message) {
    this.server.emit('message.created', message);
    this.server.to(this.roomName(message.sessionId)).emit('message.created', message);
  }

  broadcastSessionUpdated(session: SessionRealtimePayload) {
    this.server.emit('session.updated', session);
    this.server.to(this.roomName(session.id)).emit('session.updated', session);
  }

  broadcastSessionCreated(session: SessionRealtimePayload) {
    this.server.emit('session.created', session);
  }

  private roomName(sessionId: string) {
    return `session:${sessionId}`;
  }
}
