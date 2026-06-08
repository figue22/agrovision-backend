import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Recordatorio } from './domain/entities/recordatorio.entity';
import { CalendarioService } from './application/use-cases/calendario.service';
import { SesionWhatsapp } from '@modules/whatsapp/domain/entities/sesion-whatsapp.entity';
import { WhatsappModule } from '@modules/whatsapp/whatsapp.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([Recordatorio, SesionWhatsapp]),
        WhatsappModule,
    ],
    providers: [CalendarioService],
    exports: [CalendarioService],
})
export class CalendarioModule {}