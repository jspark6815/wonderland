import { registerAs } from '@nestjs/config';

/**
 * Rate Limiting 설정
 */
export default registerAs('throttle', () => ({
  short: {
    name: 'short',
    ttl: 1000, // 1초
    limit: parseInt(process.env.THROTTLE_SHORT_LIMIT || '10', 10), // 초당 10회
  },
  medium: {
    name: 'medium',
    ttl: 10000, // 10초
    limit: parseInt(process.env.THROTTLE_MEDIUM_LIMIT || '50', 10), // 10초당 50회
  },
  long: {
    name: 'long',
    ttl: 60000, // 1분
    limit: parseInt(process.env.THROTTLE_LONG_LIMIT || '200', 10), // 분당 200회
  },
}));

