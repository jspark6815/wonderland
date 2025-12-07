import { JwtPayload } from './jwt-payload.interface';

/**
 * Express Request 타입 확장
 * 
 * AuthGuard에서 JWT 검증 후 req.user에 사용자 정보를 추가할 때
 * 타입 안전성을 보장하기 위한 전역 타입 선언
 */
declare global {
  namespace Express {
    interface Request {
      /** JWT 페이로드 (인증된 사용자 정보) */
      user?: JwtPayload;
    }
  }
}

export {};

