import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { RegisterDto, LoginDto } from './dto';

import { JwtPayload as BaseJwtPayload } from '../../common/interfaces';

/**
 * AuthService 전용 JWT 페이로드 (UserRole 타입 사용)
 * 외부에서는 common/interfaces의 JwtPayload 사용
 */
interface AuthJwtPayload extends Omit<BaseJwtPayload, 'role'> {
  role: UserRole;
}

/**
 * 토큰 응답 인터페이스
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 인증 서비스
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const jwtConfig = this.configService.get('jwt');
    
    // P0: 시크릿 필수 환경변수 검증 (기본값 하드코딩 제거)
    this.jwtSecret = jwtConfig?.secret || process.env.JWT_SECRET;
    this.refreshSecret = jwtConfig?.refreshSecret || process.env.JWT_REFRESH_SECRET;
    
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is required. Set it in environment variables.');
    }
    if (!this.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required. Set it in environment variables.');
    }
    
    this.jwtExpiresIn = jwtConfig?.expiresIn || '15m';
    this.refreshExpiresIn = jwtConfig?.refreshExpiresIn || '7d';
  }

  /**
   * 회원가입
   */
  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    const { email, password, name } = registerDto;

    // 이메일 중복 체크
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      role: UserRole.USER,
    });

    await this.userRepository.save(user);
    this.logger.log(`User registered: ${email}`);

    // 토큰 발급
    return this.generateTokens(user);
  }

  /**
   * 로그인
   */
  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 활성 상태 체크
    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 마지막 로그인 시간 업데이트
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    this.logger.log(`User logged in: ${email}`);

    // 토큰 발급
    return this.generateTokens(user);
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      // Refresh Token 검증
      const payload = await this.jwtService.verifyAsync<AuthJwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });

      // 사용자 조회
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // P0: 저장된 Refresh Token 해시와 비교 (bcrypt.compare 사용)
      if (!user.refreshToken) {
        throw new UnauthorizedException('토큰이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('토큰이 만료되었습니다. 다시 로그인해주세요.');
      }

      // 새 토큰 발급
      return this.generateTokens(user);
    } catch (error) {
      this.logger.warn(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('토큰 갱신에 실패했습니다. 다시 로그인해주세요.');
    }
  }

  /**
   * 로그아웃
   */
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: undefined });
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Access Token 검증
   */
  async validateAccessToken(token: string): Promise<AuthJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: this.jwtSecret,
      });

      // 사용자 존재 및 활성 상태 체크
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('토큰 검증에 실패했습니다.');
    }
  }

  /**
   * 사용자 ID로 조회
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 토큰 생성
   */
  private async generateTokens(user: User): Promise<TokenResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 만료 시간 계산 (초)
    const accessExpiresInSeconds = this.parseExpiresIn(this.jwtExpiresIn);
    const refreshExpiresInSeconds = this.parseExpiresIn(this.refreshExpiresIn);

    // Access Token 생성
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: accessExpiresInSeconds,
    });

    // Refresh Token 생성
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: refreshExpiresInSeconds,
    });

    // P0: Refresh Token 해시하여 저장 (평문 저장 금지)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefreshToken });

    return {
      accessToken,
      refreshToken, // 클라이언트에는 원본 토큰 반환
      expiresIn: accessExpiresInSeconds,
    };
  }

  /**
   * 만료 시간 문자열을 초로 변환
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 기본 15분

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}

