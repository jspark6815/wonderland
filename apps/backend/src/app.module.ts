import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './modules/ai/ai.module';
import { PlacesModule } from './modules/places/places.module';
import { LogsModule } from './modules/logs/logs.module';
import { HttpExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { CustomThrottlerGuard, AuthGuard } from './common/guards';
import { TrimPipe } from './common/pipes';
import {
  databaseConfig,
  throttleConfig,
  corsConfig,
  aiConfig,
  jwtConfig,
} from './config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // 설정 모듈 (config 파일들 로드)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
      load: [databaseConfig, throttleConfig, corsConfig, aiConfig, jwtConfig],
    }),
    // Rate Limiting 설정 (throttle.config.ts 활용)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttle = config.get('throttle');
        return {
          throttlers: [
            throttle?.short || { name: 'short', ttl: 1000, limit: 10 },
            throttle?.medium || { name: 'medium', ttl: 10000, limit: 50 },
            throttle?.long || { name: 'long', ttl: 60000, limit: 200 },
          ],
        };
      },
    }),
    // TypeORM 설정 (database.config.ts 활용)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('database');
        return {
          type: 'postgres' as const,
          host: db?.host || 'localhost',
          port: db?.port || 5432,
          username: db?.username || 'postgres',
          password: db?.password || 'postgres',
          database: db?.database || 'wonderland',
          autoLoadEntities: db?.autoLoadEntities ?? true,
          synchronize: db?.synchronize ?? (process.env.NODE_ENV !== 'production'),
          logging: db?.logging ?? false,
        };
      },
    }),
    // LogsModule은 글로벌 모듈로 설정되어 있어 LoggingInterceptor에서 사용 가능
    LogsModule,
    // 인증 모듈 (JWT 기반)
    AuthModule,
    AiModule,
    PlacesModule,
  ],
  providers: [
    // 글로벌 Trim 파이프 (문자열 앞뒤 공백 제거)
    {
      provide: APP_PIPE,
      useClass: TrimPipe,
    },
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
    // 글로벌 인증 Guard (@Public() 데코레이터 처리)
    // AUTH_ENABLED=true 환경변수로 활성화
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // 글로벌 Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}

