import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators';

/**
 * JWT 페이로드 인터페이스
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * 인증 Guard
 * 
 * - @Public() 데코레이터가 있는 엔드포인트는 인증 스킵
 * - 그 외 엔드포인트는 JWT Bearer 토큰 검증
 * 
 * 환경변수:
 * - AUTH_ENABLED=true: 인증 활성화 (기본: false)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly isAuthEnabled: boolean;
  private readonly jwtSecret: string;

  constructor(
    private reflector: Reflector,
    @Optional() @Inject(JwtService) private jwtService?: JwtService,
    @Optional() @Inject(ConfigService) private configService?: ConfigService,
  ) {
    // 환경변수로 인증 활성화 여부 결정
    this.isAuthEnabled = process.env.AUTH_ENABLED === 'true';
    
    // JWT 시크릿 가져오기
    const jwtConfig = this.configService?.get('jwt');
    this.jwtSecret = jwtConfig?.secret || process.env.JWT_SECRET || 'wonderland-jwt-secret';
    
    if (!this.isAuthEnabled) {
      this.logger.warn(
        '⚠️  Authentication is DISABLED. Set AUTH_ENABLED=true to enable.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    
    // 1. @Public() 데코레이터 체크
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Public 엔드포인트이거나 인증 비활성화인 경우
    //    토큰이 있으면 사용자 정보는 파싱 (선택적 인증)
    if (isPublic || !this.isAuthEnabled) {
      // 토큰이 있으면 사용자 정보 추출 시도 (선택적)
      if (token && this.jwtService) {
        try {
          const payload = await this.verifyToken(token);
          (request as Request & { user: JwtPayload }).user = payload;
        } catch {
          // 토큰 검증 실패해도 public 엔드포인트이므로 무시
        }
      }
      return true;
    }

    // 3. JwtService가 없으면 인증 스킵 (AuthModule 미로드 시)
    if (!this.jwtService) {
      this.logger.warn('JwtService not available, skipping authentication');
      return true;
    }

    // 4. 인증 필수 엔드포인트: 토큰 검증
    if (!token) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    try {
      // JWT 검증
      const payload = await this.verifyToken(token);
      
      // 요청에 사용자 정보 추가
      (request as Request & { user: JwtPayload }).user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('토큰 검증에 실패했습니다.');
    }
  }

  /**
   * Authorization 헤더에서 Bearer 토큰 추출
   */
  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * JWT 토큰 검증
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService!.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
      });

      // 필수 필드 검증
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('유효하지 않은 토큰 페이로드입니다.');
      }

      return payload;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('expired')) {
        throw new UnauthorizedException('토큰이 만료되었습니다. 다시 로그인해주세요.');
      }
      if (errorMessage.includes('invalid')) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }
      
      throw new UnauthorizedException('토큰 검증에 실패했습니다.');
    }
  }
}

