import { Body, Controller, Get, Headers, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { SendTextMessageDto } from './dto';
import { imageUploadOptions } from './upload.utils';

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('admin/chat-sessions/:sessionId/messages')
  listAdminMessages(@Param('sessionId') sessionId: string) {
    return this.messagesService.listAdminMessages(sessionId);
  }

  @Post('admin/chat-sessions/:sessionId/messages/text')
  sendAdminText(@Param('sessionId') sessionId: string, @Body() body: SendTextMessageDto) {
    return this.messagesService.sendAdminTextMessage(sessionId, body.text);
  }

  @Post('admin/chat-sessions/:sessionId/messages/image')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  sendAdminImage(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('text') text?: string,
  ) {
    return this.messagesService.sendAdminImageMessage(sessionId, file, text);
  }

  @Get('customer/chat-sessions/:sessionId/messages')
  listCustomerMessages(@Param('sessionId') sessionId: string, @Headers('authorization') authorization?: string) {
    const customerToken = authorization?.replace(/^Bearer\s+/i, '');
    return this.messagesService.listCustomerMessages(sessionId, customerToken ?? '');
  }

  @Post('customer/chat-sessions/:sessionId/messages/text')
  sendCustomerText(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: SendTextMessageDto,
  ) {
    const customerToken = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    return this.messagesService.sendCustomerTextMessage(sessionId, customerToken, body.text);
  }

  @Post('customer/chat-sessions/:sessionId/messages/image')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  sendCustomerImage(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @Body('text') text?: string,
  ) {
    const customerToken = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    return this.messagesService.sendCustomerImageMessage(sessionId, customerToken, file, text);
  }
}
