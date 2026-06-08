import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ChatbotController } from './presentation/chatbot.controller';
import { ChatbotService } from './application/use-cases/chatbot.service';
import { ChatbotGateway } from './presentation/chatbot.gateway';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { Prediccion } from '@modules/predictions/domain/entities/prediccion.entity';
import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { RedisModule } from '@common/redis.module';
import { RedisCacheService } from '@common/redis/redis-cache.service';

@Module({
    imports: [
        ConfigModule,
        RedisModule,
        TypeOrmModule.forFeature([Parcela, Prediccion, Alerta]),
    ],
    controllers: [ChatbotController],
    providers: [ChatbotService, ChatbotGateway, RedisCacheService],
    exports: [ChatbotService],
})
export class ChatbotModule {}