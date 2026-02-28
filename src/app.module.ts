import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

// Feature modules (15)
import { AuthModule } from '@modules/auth/auth.module';
import { FarmersModule } from '@modules/farmers/farmers.module';
import { ParcelsModule } from '@modules/parcels/parcels.module';
import { CropsModule } from '@modules/crops/crops.module';
import { ActivitiesModule } from '@modules/activities/activities.module';
import { WeatherModule } from '@modules/weather/weather.module';
import { PredictionsModule } from '@modules/predictions/predictions.module';
import { AlertsModule } from '@modules/alerts/alerts.module';
import { RecommendationsModule } from '@modules/recommendations/recommendations.module';
import { ChatbotModule } from '@modules/chatbot/chatbot.module';
import { WhatsappModule } from '@modules/whatsapp/whatsapp.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { CatalogsModule } from '@modules/catalogs/catalogs.module';
import { AuditModule } from '@modules/audit/audit.module';
import { AdminModule } from '@modules/admin/admin.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.APP_ENV || 'development'}`,
    }),

    // Database - PostgreSQL + PostGIS
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'agrovision_user'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'agrovision_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: configService.get<boolean>('DB_LOGGING', false),
        autoLoadEntities: true,
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Redis + Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
        },
      }),
    }),

    // Feature Modules (15)
    AuthModule,
    FarmersModule,
    ParcelsModule,
    CropsModule,
    ActivitiesModule,
    WeatherModule,
    PredictionsModule,
    AlertsModule,
    RecommendationsModule,
    ChatbotModule,
    WhatsappModule,
    DocumentsModule,
    CatalogsModule,
    AuditModule,
    AdminModule,
  ],
})
export class AppModule {}
