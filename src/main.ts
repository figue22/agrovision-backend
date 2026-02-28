import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js web
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });
  app.use(cookieParser());
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('AgroVision API')
    .setDescription(
      'API Backend para AgroVision Predictor & RAG-Support. ' +
        'Plataforma agricola digital con IA predictiva, sistema RAG y chatbot WhatsApp.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingresa tu JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Autenticacion y autorizacion')
    .addTag('Farmers', 'Gestion de agricultores')
    .addTag('Parcels', 'Gestion de parcelas')
    .addTag('Crops', 'Tipos de cultivo y cultivos por parcela')
    .addTag('Activities', 'Bitacora de actividades agricolas')
    .addTag('Weather', 'Datos climaticos y pronosticos')
    .addTag('Predictions', 'Predicciones de rendimiento ML')
    .addTag('Alerts', 'Alertas climaticas')
    .addTag('Recommendations', 'Recomendaciones personalizadas')
    .addTag('Chatbot', 'Motor conversacional IA')
    .addTag('WhatsApp', 'Integracion WhatsApp Business')
    .addTag('Documents', 'Gestion documentos RAG')
    .addTag('Catalogs', 'Catalogos del sistema')
    .addTag('Audit', 'Logs de auditoria')
    .addTag('Admin', 'Panel administrativo')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`AgroVision API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

void bootstrap();
