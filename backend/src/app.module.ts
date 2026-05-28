import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { ChatSessionsModule } from './chat-sessions/chat-sessions.module';
import { MessagesModule } from './messages/messages.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    ChatSessionsModule,
    MessagesModule,
    RealtimeModule,
  ],
})
export class AppModule {}
