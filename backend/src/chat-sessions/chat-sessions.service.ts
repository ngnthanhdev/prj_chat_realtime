import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ChatSession, ChatSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { generateOpaqueToken, hashToken } from '../common/utils/tokens';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ChatSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async createCustomerSession(customerName: string) {
    const customerToken = generateOpaqueToken();
    const session = await this.prisma.chatSession.create({
      data: {
        customerName,
        customerTokenHash: hashToken(customerToken),
        status: ChatSessionStatus.open,
      },
    });

    this.realtimeGateway.broadcastSessionCreated({
      id: session.id,
      customerName: session.customerName,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastMessage: session.lastMessage,
      lastMessageType: session.lastMessageType,
      lastMessageAt: session.lastMessageAt,
    });

    return {
      sessionId: session.id,
      customerToken,
      status: session.status,
    };
  }

  async listAdminSessions() {
    return this.prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastMessage: true,
        lastMessageType: true,
        lastMessageAt: true,
      },
    });
  }

  async closeSession(sessionId: string) {
    const session = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: ChatSessionStatus.closed },
    });

    this.realtimeGateway.broadcastSessionUpdated({
      id: session.id,
      customerName: session.customerName,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastMessage: session.lastMessage,
      lastMessageType: session.lastMessageType,
      lastMessageAt: session.lastMessageAt,
    });

    return session;
  }

  async validateCustomerAccess(sessionId: string, customerToken: string): Promise<ChatSession> {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.customerTokenHash !== hashToken(customerToken)) {
      throw new UnauthorizedException('Invalid customer token');
    }
    return session;
  }
}
