import { Module } from '@nestjs/common';
import { ChatSessionsModule } from '../chat-sessions/chat-sessions.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [ChatSessionsModule, RealtimeModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
