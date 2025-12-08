import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './services/ollama.service';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    forwardRef(() => PlacesModule), // 순환 의존성 방지
  ],
  controllers: [AiController],
  providers: [AiService, OllamaService],
  exports: [AiService],
})
export class AiModule {}
