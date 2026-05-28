import { Module } from '@nestjs/common';
import { ChatSessionsController } from './chat-sessions.controller';
import { ChatSessionsService } from './chat-sessions.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [ChatSessionsController],
  providers: [ChatSessionsService],
  exports: [ChatSessionsService],
})
export class ChatSessionsModule {}
