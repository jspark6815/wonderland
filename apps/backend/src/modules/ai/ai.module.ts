import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './services/ollama.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [AiController],
  providers: [AiService, OllamaService],
  exports: [AiService],
})
export class AiModule {}
