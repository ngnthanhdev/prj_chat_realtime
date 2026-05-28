import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatSessionStatus, Message, MessageType, SenderType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ChatSessionsService } from '../chat-sessions/chat-sessions.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { buildImageUrl } from './upload.utils';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatSessionsService: ChatSessionsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async listAdminMessages(sessionId: string) {
    await this.ensureSessionExists(sessionId);
    return this.prisma.message.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
  }

  async listCustomerMessages(sessionId: string, customerToken: string) {
    await this.chatSessionsService.validateCustomerAccess(sessionId, customerToken);
    return this.prisma.message.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
  }

  async sendAdminTextMessage(sessionId: string, text: string, adminId?: string) {
    return this.sendTextMessage({ sessionId, senderType: SenderType.admin, text, adminId });
  }

  async sendCustomerTextMessage(sessionId: string, customerToken: string, text: string) {
    await this.chatSessionsService.validateCustomerAccess(sessionId, customerToken);
    return this.sendTextMessage({ sessionId, senderType: SenderType.customer, text });
  }

  async sendAdminImageMessage(sessionId: string, file: Express.Multer.File, text?: string, adminId?: string) {
    return this.sendImageMessage({ sessionId, senderType: SenderType.admin, adminId, file, text });
  }

  async sendCustomerImageMessage(sessionId: string, customerToken: string, file: Express.Multer.File, text?: string) {
    await this.chatSessionsService.validateCustomerAccess(sessionId, customerToken);
    return this.sendImageMessage({ sessionId, senderType: SenderType.customer, file, text });
  }

  private async sendTextMessage(params: { sessionId: string; senderType: SenderType; text: string; adminId?: string }): Promise<Message> {
    const trimmed = params.text.trim();
    if (!trimmed) throw new BadRequestException('Text is required');

    const session = await this.prisma.chatSession.findUnique({ where: { id: params.sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === ChatSessionStatus.closed) throw new BadRequestException('Session is closed');

    const message = await this.prisma.message.create({
      data: {
        sessionId: params.sessionId,
        adminId: params.adminId,
        senderType: params.senderType,
        messageType: MessageType.text,
        text: trimmed,
      },
    });

    const updatedSession = await this.prisma.chatSession.update({
      where: { id: params.sessionId },
      data: {
        lastMessage: trimmed,
        lastMessageType: MessageType.text,
        lastMessageAt: message.createdAt,
      },
    });

    this.broadcastMessageAndSession(message, updatedSession);

    return message;
  }

  private async sendImageMessage(params: {
    sessionId: string;
    senderType: SenderType;
    file: Express.Multer.File;
    text?: string;
    adminId?: string;
  }): Promise<Message> {
    if (!params.file) throw new BadRequestException('Image file is required');

    const session = await this.prisma.chatSession.findUnique({ where: { id: params.sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === ChatSessionStatus.closed) throw new BadRequestException('Session is closed');

    const imageUrl = buildImageUrl(params.sessionId, params.file.filename);
    const trimmed = params.text?.trim();

    const message = await this.prisma.message.create({
      data: {
        sessionId: params.sessionId,
        adminId: params.adminId,
        senderType: params.senderType,
        messageType: MessageType.image,
        imageUrl,
        text: trimmed || undefined,
      },
    });

    const updatedSession = await this.prisma.chatSession.update({
      where: { id: params.sessionId },
      data: {
        lastMessage: trimmed || '[image]',
        lastMessageType: MessageType.image,
        lastMessageAt: message.createdAt,
      },
    });

    this.broadcastMessageAndSession(message, updatedSession);

    return message;
  }

  private broadcastMessageAndSession(
    message: Message,
    updatedSession: {
      id: string;
      customerName: string;
      status: ChatSessionStatus;
      createdAt: Date;
      updatedAt: Date;
      lastMessage: string | null;
      lastMessageType: MessageType | null;
      lastMessageAt: Date | null;
    },
  ) {
    this.realtimeGateway.broadcastMessageCreated(message);
    this.realtimeGateway.broadcastSessionUpdated({
      id: updatedSession.id,
      customerName: updatedSession.customerName,
      status: updatedSession.status,
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
      lastMessage: updatedSession.lastMessage,
      lastMessageType: updatedSession.lastMessageType,
      lastMessageAt: updatedSession.lastMessageAt,
    });
  }

  private async ensureSessionExists(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}
