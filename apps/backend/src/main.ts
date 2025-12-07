import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS 설정 (cors.config.ts 활용)
  const corsConfig = configService.get('cors');
  app.enableCors({
    origin: corsConfig?.origin || process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: corsConfig?.credentials ?? true,
    methods: corsConfig?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: corsConfig?.allowedHeaders || ['Content-Type', 'Authorization'],
  });

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

  const config = new DocumentBuilder()
    .setTitle('Wonderland API')
    .setDescription('AI가 안내하는 놀라운 장소 발견 플랫폼 API')
    .setVersion('1.0')
    .addTag('places', '장소 관리 및 검색')
    .addTag('ai', 'AI 기능')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();

