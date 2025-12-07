import { registerAs } from '@nestjs/config';

/**
 * JWT 설정
 */
export default registerAs('jwt', () => ({
  // Access Token 설정
  secret: process.env.JWT_SECRET || 'wonderland-jwt-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m', // 15분
  
  // Refresh Token 설정
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'wonderland-refresh-secret-change-in-production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7일
}));

