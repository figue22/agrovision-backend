import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { RedisCacheService } from './redis/redis-cache.service';
import { RedisSessionService } from './redis/redis-session.service';
import { NotificationProcessor } from './queue/notification.processor';
import { NotificationQueueService } from './queue/notification-queue.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    RedisCacheService,
    RedisSessionService,
    NotificationProcessor,
    NotificationQueueService,
  ],
  exports: [
    RedisCacheService,
    RedisSessionService,
    NotificationQueueService,
  ],
})
export class RedisModule {}