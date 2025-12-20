import { registerAs } from '@nestjs/config';

/**
 * AI/LLM 설정
 */
export default registerAs('ai', () => ({
  /**
   * LLM Provider 선택
   * - ollama: 로컬 Ollama (기본)
   * - gemini: Google Gemini API
   */
  provider: (process.env.AI_PROVIDER || 'ollama').toLowerCase(),

  // 공통 generation 옵션 (provider별로 동일하게 사용)
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || process.env.LLM_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || process.env.LLM_MAX_TOKENS || '2048', 10),
  timeout: parseInt(process.env.GEMINI_TIMEOUT || process.env.LLM_TIMEOUT || '30000', 10),

  // Ollama 설정
  ollama: {
    host: process.env.LLM_HOST || 'http://localhost:11434',
    model: process.env.LLM_MODEL || 'llama3.2:3b',
  },

  // Gemini 설정
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
  },
}));

