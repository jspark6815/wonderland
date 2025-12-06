import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './modules/ai/ai.module';
import { PlacesModule } from './modules/places/places.module';
import { LogsModule } from './modules/logs/logs.module';
import { HttpExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { CustomThrottlerGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),
    // Rate Limiting 설정
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1초
            limit: config.get('THROTTLE_SHORT_LIMIT', 10), // 초당 10회
          },
          {
            name: 'medium',
            ttl: 10000, // 10초
            limit: config.get('THROTTLE_MEDIUM_LIMIT', 50), // 10초당 50회
          },
          {
            name: 'long',
            ttl: 60000, // 1분
            limit: config.get('THROTTLE_LONG_LIMIT', 200), // 분당 200회
          },
        ],
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'wonderland',
      autoLoadEntities: true,
      // 개발 환경에서 테이블 자동 생성 (NODE_ENV가 없거나 development일 때)
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    // LogsModule은 글로벌 모듈로 설정되어 있어 LoggingInterceptor에서 사용 가능
    LogsModule,
    AiModule,
    PlacesModule,
  ],
  providers: [
    // 글로벌 에러 필터
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // 글로벌 로깅 인터셉터
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 글로벌 Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}

