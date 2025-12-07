import { registerAs } from '@nestjs/config';

/**
 * AI/LLM 설정
 */
export default registerAs('ai', () => ({
  // Ollama 서버 URL
  host: process.env.LLM_HOST || 'http://localhost:11434',
  // 사용할 모델
  model: process.env.LLM_MODEL || 'llama3.2:3b',
  // 응답 다양성 (0.0 ~ 1.0)
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  // 최대 토큰 수
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
  // API 타임아웃 (ms)
  timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
}));

