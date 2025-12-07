import { registerAs } from '@nestjs/config';

/**
 * CORS 설정
 */
export default registerAs('cors', () => {
  const origin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
  
  return {
    // 여러 origin 지원 (콤마로 구분)
    origin: origin.includes(',') ? origin.split(',').map(o => o.trim()) : origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
});

