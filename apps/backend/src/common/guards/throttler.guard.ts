import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * 커스텀 Throttler Guard
 * IP 기반 Rate Limiting + 로깅
 */
@Injectable()
export class CustomThrottlerGuard extends NestThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  /**
   * Rate Limit 초과 시 처리
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getTracker(request);
    const url = request.url;
    const method = request.method;

    this.logger.warn(
      `🚫 Rate limit exceeded - IP: ${ip}, ${method} ${url}`,
    );

    throw new ThrottlerException('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
  }

  /**
   * IP 주소 추출 (프록시 환경 지원)
   */
  protected getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded
      ? (forwarded as string).split(',')[0].trim()
      : req.ip || req.connection?.remoteAddress || 'unknown';

    return Promise.resolve(ip);
  }

  /**
   * Rate Limiting 적용 여부 결정
   * 특정 경로는 제외 가능
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { url } = request;

    // Health check는 Rate Limiting 제외
    const skipPaths = ['/api/v1/health', '/api/v1/ai/health'];
    
    return skipPaths.some(path => url.startsWith(path));
  }
}

