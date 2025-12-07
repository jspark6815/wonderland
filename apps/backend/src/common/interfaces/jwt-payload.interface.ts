/**
 * JWT 페이로드 인터페이스
 * 
 * 인증 시스템 전체에서 사용되는 통합 JWT 페이로드 타입
 * - AuthGuard에서 토큰 검증 시
 * - @CurrentUser() 데코레이터에서 사용자 정보 추출 시
 * - AuthService에서 토큰 생성 시
 */
export interface JwtPayload {
  /** 사용자 ID (subject) */
  sub: string;
  
  /** 이메일 */
  email: string;
  
  /** 사용자 역할 */
  role: string;
  
  /** 토큰 발급 시간 (issued at) - 초 단위 Unix timestamp */
  iat?: number;
  
  /** 토큰 만료 시간 (expiration) - 초 단위 Unix timestamp */
  exp?: number;
}

/**
 * JWT 페이로드의 추출 가능한 필드 키
 */
export type JwtPayloadKey = keyof JwtPayload;

