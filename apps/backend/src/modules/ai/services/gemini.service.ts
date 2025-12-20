import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';
import {
  type LlmClient,
  type LlmGenerateOptions,
  type LlmGenerateResult,
  type LlmProviderName,
} from './llm-client';

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const toGeminiText = (data: unknown): string | null => {
  if (!isRecord(data)) return null;
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (!isRecord(first)) return null;
  const content = first.content;
  if (!isRecord(content)) return null;
  const parts = content.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const texts = parts
    .map((p) => (isRecord(p) && typeof p.text === 'string' ? p.text : ''))
    .filter((t) => t.length > 0);
  return texts.length > 0 ? texts.join('') : null;
};

@Injectable()
export class GeminiService implements LlmClient {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('ai.gemini.apiKey') || '';
    this.model = this.configService.get<string>('ai.gemini.model') || 'gemini-1.5-flash';
    this.baseUrl =
      this.configService.get<string>('ai.gemini.baseUrl') ||
      'https://generativelanguage.googleapis.com/v1beta';

    this.temperature = Number(this.configService.get<number>('ai.temperature') ?? 0.7);
    this.maxTokens = Number(this.configService.get<number>('ai.maxTokens') ?? 2048);
    this.timeoutMs = Number(this.configService.get<number>('ai.timeout') ?? 30000);
  }

  getProviderName(): LlmProviderName {
    return 'gemini';
  }

  getModelName(): string {
    return this.model;
  }

  async generate(prompt: string, opts?: LlmGenerateOptions): Promise<LlmGenerateResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<GeminiGenerateContentResponse>(
          url,
          {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: this.temperature,
              maxOutputTokens: this.maxTokens,
              ...(opts?.forceJson ? { responseMimeType: 'application/json' } : {}),
            },
          },
          {
            params: { key: this.apiKey },
            timeout: this.timeoutMs,
          },
        ),
      );

      const text = toGeminiText(response.data);
      if (typeof text !== 'string' || text.length === 0) {
        this.logger.warn('Gemini response missing text parts');
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      return { response: text };
    } catch (e: unknown) {
      const err = e as AxiosError<unknown>;
      const status = err.response?.status;
      const message =
        typeof err.message === 'string' && err.message.length > 0
          ? err.message
          : '알 수 없는 오류';

      if (status === 401 || status === 403) {
        throw new Error('Gemini 인증에 실패했습니다. GEMINI_API_KEY를 확인해주세요.');
      }

      throw new Error(`AI 생성에 실패했습니다: ${message}`);
    }
  }

  /**
   * Gemini 스트리밍은 SDK/엔드포인트 선택에 따라 포맷이 달라질 수 있어,
   * 현재는 "비스트리밍 호출 후 한 번에 yield"하는 방식으로 호환성을 유지합니다.
   */
  async *generateStream(prompt: string, opts?: LlmGenerateOptions): AsyncGenerator<string> {
    const result = await this.generate(prompt, opts);
    yield result.response;
  }

  async checkModelStatus(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // 모델 리스트 조회 대신, 아주 간단한 생성 요청을 보내서
      // 키 유효성 및 모델 가용성을 확실하게 체크함
      await this.generate('Hi', { forceJson: false });
      return true;
    } catch {
      return false;
    }
  }
}


