import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './services/ollama.service';
import { GeminiService } from './services/gemini.service';
import { AiCacheService } from './services/ai-cache.service';
import { LLM_CLIENT, type LlmClient } from './services/llm-client';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    forwardRef(() => PlacesModule), // 순환 의존성 방지
  ],
  controllers: [AiController],
  providers: [
    AiService,
    OllamaService,
    GeminiService,
    AiCacheService, // AI 쿼리 캐시 (토큰 절약)
    {
      provide: LLM_CLIENT,
      inject: [ConfigService, OllamaService, GeminiService],
      useFactory: (config: ConfigService, ollama: OllamaService, gemini: GeminiService): LlmClient => {
        const providerRaw = config.get<string>('ai.provider') || 'ollama';
        const provider = providerRaw.toLowerCase();
        return provider === 'gemini' ? gemini : ollama;
      },
    },
  ],
  exports: [AiService, AiCacheService],
})
export class AiModule {}
