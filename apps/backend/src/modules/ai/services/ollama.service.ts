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
      this.logger.debug(`Generating with model: ${this.model}, URL: ${this.ollamaUrl}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.ollamaUrl}/api/generate`, {
          model: this.model,
          prompt,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false,
        }, {
          timeout: 30000, // 30초 타임아웃 (AI 응답은 시간이 걸릴 수 있음)
        }),
      );

      if (!response.data || !response.data.response) {
        this.logger.warn('Ollama response missing response field:', response.data);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.logger.error(`Ollama connection failed. URL: ${this.ollamaUrl}, Error: ${error.message}`);
        throw new Error(`AI 서비스에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.`);
      }
      
      this.logger.error('Ollama generation failed:', error.message || error);
      throw new Error(`AI 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
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
        this.httpService.get(`${this.ollamaUrl}/api/tags`, {
          timeout: 5000,
        }),
      );
      
      const models = response.data.models || [];
      const modelExists = models.some((m: any) => m.name === this.model);
      
      if (!modelExists) {
        this.logger.warn(`Model ${this.model} not found. Available models: ${models.map((m: any) => m.name).join(', ')}`);
      }
      
      return modelExists;
    } catch (error: any) {
      this.logger.error(`Model status check failed. URL: ${this.ollamaUrl}, Error: ${error.message}`);
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
