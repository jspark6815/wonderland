import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AddFavoriteDto, UpdateFavoriteDto } from './dto/favorite.dto';

// 글로벌 AuthGuard가 적용되어 있으므로 별도 Guard 불필요
// @Public() 데코레이터가 없는 엔드포인트는 자동으로 인증 필요
@ApiTags('users')
@Controller('api/v1/users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== 프로필 ====================

  @Get('profile')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: HttpStatus.OK, description: '프로필 정보' })
  async getProfile(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: '프로필 수정' })
  @ApiResponse({ status: HttpStatus.OK, description: '수정된 프로필' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const userId = (req.user as any).sub;
    return this.usersService.updateProfile(userId, dto);
  }

  // ==================== 설정 ====================

  @Get('settings')
  @ApiOperation({ summary: '내 설정 조회' })
  @ApiResponse({ status: HttpStatus.OK, description: '설정 정보' })
  async getSettings(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.usersService.getSettings(userId);
  }

  @Put('settings')
  @ApiOperation({ summary: '설정 수정' })
  @ApiResponse({ status: HttpStatus.OK, description: '수정된 설정' })
  async updateSettings(@Req() req: Request, @Body() dto: UpdateSettingsDto) {
    const userId = (req.user as any).sub;
    return this.usersService.updateSettings(userId, dto);
  }

  // ==================== 즐겨찾기 ====================

  @Get('favorites')
  @ApiOperation({ summary: '즐겨찾기 목록 조회' })
  @ApiResponse({ status: HttpStatus.OK, description: '즐겨찾기 목록' })
  async getFavorites(
    @Req() req: Request,
    @Query('folder') folder?: string,
  ) {
    const userId = (req.user as any).sub;
    return this.usersService.getFavorites(userId, folder);
  }

  @Get('favorites/folders')
  @ApiOperation({ summary: '즐겨찾기 폴더 목록' })
  @ApiResponse({ status: HttpStatus.OK, description: '폴더 목록' })
  async getFavoriteFolders(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.usersService.getFavoriteFolders(userId);
  }

  @Get('favorites/check/:placeId')
  @ApiOperation({ summary: '특정 장소 즐겨찾기 여부 확인' })
  @ApiResponse({ status: HttpStatus.OK, description: '즐겨찾기 여부' })
  async checkFavorite(
    @Req() req: Request,
    @Param('placeId') placeId: string,
  ) {
    const userId = (req.user as any).sub;
    const isFavorite = await this.usersService.isFavorite(userId, placeId);
    return { isFavorite };
  }

  @Post('favorites')
  @ApiOperation({ summary: '즐겨찾기 추가' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '추가된 즐겨찾기' })
  async addFavorite(@Req() req: Request, @Body() dto: AddFavoriteDto) {
    const userId = (req.user as any).sub;
    return this.usersService.addFavorite(userId, dto);
  }

  @Put('favorites/:id')
  @ApiOperation({ summary: '즐겨찾기 수정' })
  @ApiResponse({ status: HttpStatus.OK, description: '수정된 즐겨찾기' })
  async updateFavorite(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateFavoriteDto,
  ) {
    const userId = (req.user as any).sub;
    return this.usersService.updateFavorite(userId, id, dto);
  }

  @Delete('favorites/:id')
  @ApiOperation({ summary: '즐겨찾기 삭제' })
  @ApiResponse({ status: HttpStatus.OK, description: '삭제 성공' })
  async removeFavorite(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).sub;
    return this.usersService.removeFavorite(userId, id);
  }

  @Delete('favorites/place/:placeId')
  @ApiOperation({ summary: '장소 ID로 즐겨찾기 삭제 (토글용)' })
  @ApiResponse({ status: HttpStatus.OK, description: '삭제 성공' })
  async removeFavoriteByPlaceId(
    @Req() req: Request,
    @Param('placeId') placeId: string,
  ) {
    const userId = (req.user as any).sub;
    return this.usersService.removeFavoriteByPlaceId(userId, placeId);
  }
}

