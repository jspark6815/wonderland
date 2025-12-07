import { SetMetadata } from '@nestjs/common';

/**
 * 공개 API 메타데이터 키
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 인증이 필요 없는 공개 API를 표시하는 데코레이터
 * 
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

