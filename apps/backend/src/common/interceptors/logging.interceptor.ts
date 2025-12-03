import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * 요청/응답 로깅 인터셉터
 * API 요청 시작, 완료, 소요 시간을 로깅
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip, body } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // 요청 ID 생성 (추적용)
    const requestId = this.generateRequestId();
    (request as any).requestId = requestId;

    // 요청 시작 로깅
    this.logger.log(
      `[${requestId}] ➡️  ${method} ${url} - ${ip} - ${userAgent.substring(0, 50)}`,
    );

    // 요청 바디 로깅 (민감정보 제외, 개발 환경에서만)
    if (process.env.NODE_ENV !== 'production' && Object.keys(body || {}).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`[${requestId}] Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          // 응답 로깅
          this.logResponse(requestId, method, url, statusCode, duration);
          
          // 느린 요청 경고 (1초 이상)
          if (duration > 1000) {
            this.logger.warn(
              `[${requestId}] ⚠️  Slow request: ${method} ${url} took ${duration}ms`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          this.logger.error(
            `[${requestId}] ❌ ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }

  /**
   * 응답 로깅
   */
  private logResponse(
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
  ): void {
    const statusEmoji = statusCode < 400 ? '✅' : '⚠️';
    const durationColor = duration < 100 ? '' : duration < 500 ? '🟡' : '🔴';
    
    this.logger.log(
      `[${requestId}] ${statusEmoji} ${method} ${url} - ${statusCode} - ${durationColor}${duration}ms`,
    );
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 민감 정보 제거
   */
  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

