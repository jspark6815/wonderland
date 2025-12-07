import { registerAs } from '@nestjs/config';

/**
 * 데이터베이스 설정
 */
export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'wonderland',
  autoLoadEntities: true,
  // 프로덕션에서는 반드시 false, 마이그레이션 사용
  synchronize: process.env.NODE_ENV !== 'production',
  // 개발 환경에서만 쿼리 로깅
  logging: process.env.NODE_ENV === 'development',
}));

