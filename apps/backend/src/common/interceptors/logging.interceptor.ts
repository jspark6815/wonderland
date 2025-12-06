import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LogsService } from '../../modules/logs/logs.service';

/**
 * 요청/응답 로깅 인터셉터
 * API 요청 시작, 완료, 소요 시간을 로깅 + DB 저장
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    @Optional() @Inject(LogsService) private readonly logsService?: LogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip, body, query } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // 요청 ID 생성 (추적용)
    const requestId = this.generateRequestId();
    (request as any).requestId = requestId;

    // URL에서 경로만 추출 (쿼리 파라미터 제외)
    const path = url.split('?')[0];

    // 요청 시작 로깅
    this.logger.log(
      `[${requestId}] ➡️  ${method} ${url} - ${ip} - ${userAgent.substring(0, 50)}`,
    );

    // 요청 바디 로깅 (민감정보 제외, 개발 환경에서만)
    const sanitizedBody = this.sanitizeBody(body || {});
    if (process.env.NODE_ENV !== 'production' && Object.keys(sanitizedBody).length > 0) {
      this.logger.debug(`[${requestId}] Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const isSlow = duration > 1000;
          
          // 응답 로깅
          this.logResponse(requestId, method, url, statusCode, duration);
          
          // 느린 요청 경고 (1초 이상)
          if (isSlow) {
            this.logger.warn(
              `[${requestId}] ⚠️  Slow request: ${method} ${url} took ${duration}ms`,
            );
          }

          // DB에 로그 저장 (비동기, 실패해도 무시)
          this.saveLogToDb({
            requestId,
            method,
            url,
            path,
            statusCode,
            duration,
            ip: this.getClientIp(request),
            userAgent: userAgent.substring(0, 500),
            requestBody: Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
            queryParams: Object.keys(query || {}).length > 0 ? query as Record<string, unknown> : undefined,
            isError: false,
            isSlow,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          const isSlow = duration > 1000;
          
          this.logger.error(
            `[${requestId}] ❌ ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
          );

          // DB에 에러 로그 저장
          this.saveLogToDb({
            requestId,
            method,
            url,
            path,
            statusCode,
            duration,
            ip: this.getClientIp(request),
            userAgent: userAgent.substring(0, 500),
            requestBody: Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
            queryParams: Object.keys(query || {}).length > 0 ? query as Record<string, unknown> : undefined,
            errorMessage: error.message?.substring(0, 1000),
            errorStack: error.stack?.substring(0, 5000),
            isError: true,
            isSlow,
          });
        },
      }),
    );
  }

  /**
   * DB에 로그 저장 (비동기)
   */
  private saveLogToDb(logData: Parameters<LogsService['saveLog']>[0]): void {
    if (this.logsService) {
      // 로그 저장은 메인 요청에 영향을 주지 않도록 비동기로 처리
      this.logsService.saveLog(logData).catch(() => {
        // 저장 실패는 무시
      });
    }
  }

  /**
   * 클라이언트 IP 추출 (프록시 환경 지원)
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || 'unknown';
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

