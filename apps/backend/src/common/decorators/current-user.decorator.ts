import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * 현재 인증된 사용자 정보를 추출하는 데코레이터
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * 
 * // 특정 필드만 추출
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: Record<string, unknown> }).user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

