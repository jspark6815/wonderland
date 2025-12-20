import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';
import type { AxiosError } from 'axios';
import {
  type LlmClient,
  type LlmGenerateOptions,
  type LlmGenerateResult,
  type LlmProviderName,
} from './llm-client';

@Injectable()
export class OllamaService implements LlmClient {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ollamaUrl =
      this.configService.get<string>('ai.ollama.host') || 'http://localhost:11434';
    this.model = this.configService.get<string>('ai.ollama.model') || 'llama3.2:3b';
    this.temperature = Number(this.configService.get<number>('ai.temperature') ?? 0.7);
    this.maxTokens = Number(this.configService.get<number>('ai.maxTokens') ?? 2048);
    this.timeoutMs = Number(this.configService.get<number>('ai.timeout') ?? 30000);
  }

  getProviderName(): LlmProviderName {
    return 'ollama';
  }

  getModelName(): string {
    return this.model;
  }

  private isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }

  /**
   * Ollama API를 통한 텍스트 생성
   */
  async generate(prompt: string, opts?: LlmGenerateOptions): Promise<LlmGenerateResult> {
    try {
      this.logger.debug(`Generating with model: ${this.model}, URL: ${this.ollamaUrl}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.ollamaUrl}/api/generate`, {
          model: this.model,
          prompt,
          ...(opts?.forceJson ? { format: 'json' } : {}),
          // Ollama 옵션은 options 객체로 전달 (max_tokens는 공식 파라미터가 아님)
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens,
          },
          stream: false,
        }, {
          timeout: this.timeoutMs, // AI 응답은 시간이 걸릴 수 있음
        }),
      );

      const data: unknown = response.data;
      if (!this.isRecord(data) || typeof data.response !== 'string' || data.response.length === 0) {
        this.logger.warn('Ollama response missing response field:', response.data);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      return { response: data.response };
    } catch (error: unknown) {
      const err = error as AxiosError<unknown>;
      const status = err.response?.status;
      const data: unknown = err.response?.data;

      // 모델 미존재 / 잘못된 모델명
      if (
        status === 404 &&
        this.isRecord(data) &&
        typeof data.error === 'string' &&
        data.error.toLowerCase().includes('model')
      ) {
        this.logger.error(`Ollama model not found: ${this.model}. Error: ${data.error}`);
        throw new Error(`Ollama 모델을 찾을 수 없습니다: ${this.model}. (ollama pull ${this.model} 필요)`);
      }

      // 연결 실패/타임아웃
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        this.logger.error(`Ollama connection failed. URL: ${this.ollamaUrl}, Error: ${err.message}`);
        throw new Error(`AI 서비스에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.`);
      }
      
      this.logger.error('Ollama generation failed:', err.message || err);
      throw new Error(`AI 생성에 실패했습니다: ${err.message || '알 수 없는 오류'}`);
    }
  }

  /**
   * 스트리밍 방식으로 텍스트 생성
   */
  async *generateStream(
    prompt: string,
    opts?: LlmGenerateOptions,
  ): AsyncGenerator<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.ollamaUrl}/api/generate`,
          {
            model: this.model,
            prompt,
            ...(opts?.forceJson ? { format: 'json' } : {}),
            options: {
              temperature: this.temperature,
              num_predict: this.maxTokens,
            },
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
            const json: unknown = JSON.parse(line);
            if (this.isRecord(json) && typeof json.response === 'string') {
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
      
      const data: unknown = response.data;
      const models = this.isRecord(data) ? data.models : undefined;
      const modelArr: unknown[] = Array.isArray(models) ? models : [];
      const modelExists = modelArr.some((m) => this.isRecord(m) && m.name === this.model);
      
      if (!modelExists) {
        const names = modelArr
          .map((m) => (this.isRecord(m) && typeof m.name === 'string' ? m.name : ''))
          .filter((n) => n.length > 0);
        this.logger.warn(`Model ${this.model} not found. Available models: ${names.join(', ')}`);
      }
      
      return modelExists;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Model status check failed. URL: ${this.ollamaUrl}, Error: ${err.message}`);
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

      const data: unknown = response.data;
      if (!this.isRecord(data) || !Array.isArray(data.embedding)) {
        throw new Error('임베딩 응답 형식이 올바르지 않습니다.');
      }
      const embedding = data.embedding
        .filter((n) => typeof n === 'number')
        .map((n) => n);
      return embedding;
    } catch (error) {
      this.logger.error('Embedding creation failed:', error);
      throw new Error('임베딩 생성에 실패했습니다.');
    }
  }
}
