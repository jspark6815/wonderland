export interface LlmGenerateOptions {
  /**
   * 모델 출력이 "유효한 JSON"이 되도록 가능한 옵션을 활성화합니다.
   * - Ollama: format=json
   * - Gemini: responseMimeType=application/json (지원 시)
   */
  forceJson?: boolean;
}

export interface LlmGenerateResult {
  response: string;
}

export type LlmProviderName = 'ollama' | 'gemini';

export interface LlmClient {
  generate(prompt: string, opts?: LlmGenerateOptions): Promise<LlmGenerateResult>;
  generateStream(prompt: string, opts?: LlmGenerateOptions): AsyncGenerator<string>;
  checkModelStatus(): Promise<boolean>;
  getModelName(): string;
  getProviderName(): LlmProviderName;
}

export const LLM_CLIENT = 'LLM_CLIENT';


