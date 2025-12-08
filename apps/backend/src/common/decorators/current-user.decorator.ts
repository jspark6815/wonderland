import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * JWT 페이로드 인터페이스
 */
export interface JwtUserPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * 현재 인증된 사용자 정보를 추출하는 데코레이터
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtUserPayload) {
 *   return user;
 * }
 * 
 * // 특정 필드만 추출 (타입 안전)
 * @Get('my-id')
 * getMyId(@CurrentUser('sub') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUserPayload | undefined, ctx: ExecutionContext): string | JwtUserPayload | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: JwtUserPayload }).user;

    if (!user) {
      return null;
    }

    if (data) {
      // 특정 필드 추출 시 해당 값 반환
      const value = user[data];
      return value !== undefined ? String(value) : null;
    }

    return user;
  },
);

