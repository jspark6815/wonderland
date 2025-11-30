import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ollamaUrl = this.configService.get('LLM_HOST', 'http://localhost:11434');
    this.model = this.configService.get('LLM_MODEL', 'llama3.2:3b');
    this.temperature = parseFloat(this.configService.get('LLM_TEMPERATURE', '0.7'));
    this.maxTokens = parseInt(this.configService.get('LLM_MAX_TOKENS', '2048'), 10);
  }

  /**
   * Ollama API를 통한 텍스트 생성
   */
  async generate(prompt: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.ollamaUrl}/api/generate`, {
          model: this.model,
          prompt,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false,
        }, {
          timeout: 15000, // 15초 타임아웃
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Ollama generation failed:', error);
      throw new Error('AI 생성에 실패했습니다.');
    }
  }

  /**
   * 스트리밍 방식으로 텍스트 생성
   */
  async *generateStream(prompt: string): AsyncGenerator<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.ollamaUrl}/api/generate`,
          {
            model: this.model,
            prompt,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            stream: true,
          },
          { responseType: 'stream' },
        ),
      );

      const stream = response.data as Readable;
      
      for await (const chunk of stream) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              yield json.response;
            }
          } catch {
            // JSON 파싱 오류 무시
          }
        }
      }
    } catch (error) {
      this.logger.error('Ollama streaming failed:', error);
      throw new Error('AI 스트리밍에 실패했습니다.');
    }
  }

  /**
   * 모델 상태 확인
   */
  async checkModelStatus(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ollamaUrl}/api/tags`),
      );
      
      const models = response.data.models || [];
      return models.some((m: any) => m.name === this.model);
    } catch (error) {
      this.logger.error('Model status check failed:', error);
      return false;
    }
  }

  /**
   * 임베딩 생성
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.ollamaUrl}/api/embeddings`, {
          model: this.model,
          prompt: text,
        }),
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Embedding creation failed:', error);
      throw new Error('임베딩 생성에 실패했습니다.');
    }
  }
}
