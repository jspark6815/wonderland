import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { Public, CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '회원가입 성공' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: '이메일 중복' })
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: HttpStatus.OK, description: '로그인 성공' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '인증 실패' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: HttpStatus.OK, description: '토큰 갱신 성공' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '토큰 만료 또는 유효하지 않음' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: HttpStatus.OK, description: '로그아웃 성공' })
  async logout(@CurrentUser('sub') userId: string | null): Promise<{ message: string }> {
    if (!userId) {
      throw new UnauthorizedException('인증 정보가 없습니다.');
    }
    await this.authService.logout(userId);
    return { message: '로그아웃되었습니다.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 사용자 정보' })
  @ApiResponse({ status: HttpStatus.OK, description: '사용자 정보 조회 성공' })
  async getMe(@CurrentUser('sub') userId: string) {
    const user = await this.authService.findById(userId);
    if (!user) {
      return null;
    }
    
    // 비밀번호, refreshToken 제외
    const { password, refreshToken, ...userInfo } = user;
    return userInfo;
  }
}

