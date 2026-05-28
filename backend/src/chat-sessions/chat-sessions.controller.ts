import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ChatSessionsService } from './chat-sessions.service';
import { CreateChatSessionDto } from './dto';

@Controller()
export class ChatSessionsController {
  constructor(private readonly chatSessionsService: ChatSessionsService) {}

  @Post('customer/chat-sessions')
  createCustomerSession(@Body() body: CreateChatSessionDto) {
    return this.chatSessionsService.createCustomerSession(body.customerName);
  }

  @Get('admin/chat-sessions')
  listAdminSessions() {
    return this.chatSessionsService.listAdminSessions();
  }

  @Patch('admin/chat-sessions/:sessionId/close')
  closeSession(@Param('sessionId') sessionId: string) {
    return this.chatSessionsService.closeSession(sessionId);
  }

  @Get('customer/chat-sessions/:sessionId/access')
  customerAccessCheck(@Param('sessionId') sessionId: string, @Headers('authorization') authorization?: string) {
    const customerToken = authorization?.replace(/^Bearer\s+/i, '');
    if (!customerToken) {
      return { ok: false };
    }
    return this.chatSessionsService.validateCustomerAccess(sessionId, customerToken).then(() => ({ ok: true }));
  }
}
