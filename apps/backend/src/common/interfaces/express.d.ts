import { JwtPayload } from './jwt-payload.interface';

/**
 * Express Request 타입 확장
 * 
 * AuthGuard에서 JWT 검증 후 req.user에 사용자 정보를 추가할 때
 * 타입 안전성을 보장하기 위한 전역 타입 선언
 * 
 * Note: Passport.js가 Express.User를 사용하므로, 
 * User 인터페이스를 JwtPayload로 확장해야 함
 */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends JwtPayload {}
  }
}

export {};

