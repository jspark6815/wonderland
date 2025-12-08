import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PlacesService } from './places.service';
import { SearchHistoryService } from './services/search-history.service';
import { SearchPlacesDto } from './dto/search-places.dto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { BoundsSearchDto } from './dto/bounds-search.dto';
import { GetSearchHistoryDto, SearchHistoryResponseDto } from './dto/search-history.dto';
import { Place } from '../../entities/place.entity';
import { Public } from '../../common';

@ApiTags('places')
@Controller('api/v1/places')
export class PlacesController {
  private readonly logger = new Logger(PlacesController.name);

  constructor(
    private readonly placesService: PlacesService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: '장소 검색 (하이브리드)' })
  @ApiResponse({
    status: 200,
    description: '검색 결과',
    type: [Place],
  })
  async searchPlaces(
    @Query() searchDto: SearchPlacesDto,
    @Req() req: Request,
  ): Promise<Place[]> {
    const results = await this.placesService.searchPlaces(searchDto);
    
    // P1-2: Express Request 타입 확장 적용 (캐스팅 불필요)
    const userId = req.user?.sub;
    if (userId && searchDto.query) {
      this.searchHistoryService.saveSearch({
        userId,
        query: searchDto.query,
        category: searchDto.category,
        latitude: searchDto.lat,
        longitude: searchDto.lng,
        resultCount: results.length,
      }).catch(err => {
        // P2-1: console.error 대신 Logger 사용
        this.logger.warn(`Failed to save search history: ${err.message}`);
      });
    }
    
    return results;
  }

  @Get('nearby')
  @Public()
  @ApiOperation({ summary: '주변 장소 검색' })
  @ApiResponse({
    status: 200,
    description: '주변 장소 목록',
    type: [Place],
  })
  async searchNearby(@Query() nearbyDto: NearbySearchDto): Promise<Place[]> {
    return this.placesService.searchNearby(nearbyDto);
  }

  @Get('bounds')
  @Public()
  @ApiOperation({ summary: '지도 영역 기반 장소 검색' })
  @ApiResponse({
    status: 200,
    description: '지도 영역 내 장소 목록',
    type: [Place],
  })
  async searchByBounds(@Query() boundsDto: BoundsSearchDto): Promise<Place[]> {
    return this.placesService.searchByBounds(boundsDto);
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: '인기 장소 조회' })
  @ApiResponse({
    status: 200,
    description: '인기 장소 목록',
    type: [Place],
  })
  async getPopularPlaces(
    @Query('limit') limit: number = 10,
  ): Promise<Place[]> {
    return this.placesService.getPopularPlaces(limit);
  }

  // 주의: 'detail/by-location'과 'history/*'는 ':id' 보다 먼저 정의되어야 함
  // NestJS는 라우트를 순서대로 매칭하므로, 구체적인 경로가 먼저 와야 함
  @Get('detail/by-location')
  @Public()
  @ApiOperation({ summary: '장소 상세 정보 (이름과 좌표로 조회)' })
  @ApiResponse({
    status: 200,
    description: '장소 상세 정보',
    type: Place,
  })
  async getPlaceDetailByLocation(
    @Query('name') name: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ): Promise<Place> {
    return this.placesService.getPlaceDetailByNameAndLocation(name, lat, lng);
  }

  // ===============================
  // 검색 기록 API (반드시 :id 라우트보다 먼저 정의)
  // ===============================

  @Get('history/recent')
  @ApiBearerAuth()
  @ApiOperation({ summary: '최근 검색 기록 조회' })
  @ApiResponse({
    status: 200,
    description: '최근 검색 기록 목록',
    type: [SearchHistoryResponseDto],
  })
  async getRecentSearchHistory(
    @Req() req: Request,
    @Query() dto: GetSearchHistoryDto,
  ): Promise<SearchHistoryResponseDto[]> {
    // P1-2: Express Request 타입 확장 적용
    const userId = req.user?.sub;
    if (!userId) {
      return [];
    }
    return this.searchHistoryService.getRecentSearches(userId, dto.limit);
  }

  @Get('history/last')
  @ApiBearerAuth()
  @ApiOperation({ summary: '마지막 검색 기록 조회' })
  @ApiResponse({
    status: 200,
    description: '마지막 검색 기록',
    type: SearchHistoryResponseDto,
  })
  async getLastSearchHistory(
    @Req() req: Request,
  ): Promise<SearchHistoryResponseDto | null> {
    const userId = req.user?.sub;
    if (!userId) {
      return null;
    }
    return this.searchHistoryService.getLastSearch(userId);
  }

  @Delete('history/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 검색 기록 삭제' })
  @ApiResponse({
    status: 200,
    description: '삭제 결과',
  })
  async deleteSearchHistory(
    @Req() req: Request,
    @Param('id') searchId: string,
  ): Promise<{ deleted: boolean }> {
    const userId = req.user?.sub;
    if (!userId) {
      return { deleted: false };
    }
    const deleted = await this.searchHistoryService.deleteSearch(userId, searchId);
    return { deleted };
  }

  @Delete('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 검색 기록 삭제' })
  @ApiResponse({
    status: 200,
    description: '삭제된 개수',
  })
  async clearSearchHistory(
    @Req() req: Request,
  ): Promise<{ deletedCount: number }> {
    const userId = req.user?.sub;
    if (!userId) {
      return { deletedCount: 0 };
    }
    const deletedCount = await this.searchHistoryService.clearHistory(userId);
    return { deletedCount };
  }

  // ===============================
  // ID 기반 라우트 (와일드카드 - 마지막에 정의)
  // ===============================

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '장소 상세 정보 (ID로 조회)' })
  @ApiResponse({
    status: 200,
    description: '장소 상세 정보',
    type: Place,
  })
  async getPlaceDetail(@Param('id') id: string): Promise<Place> {
    return this.placesService.getPlaceDetail(id);
  }

  /**
   * 장소 등록
   * - 인증 필수: @Public() 제거
   * - Rate limiting: 1분에 최대 5회
   * - DTO 유효성 검사: 강화된 CreatePlaceDto 적용
   */
  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1분에 최대 5회
  @ApiOperation({ summary: '장소 등록 (인증 필수)' })
  @ApiResponse({
    status: 201,
    description: '장소 등록 완료',
    type: Place,
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit 초과 (1분에 최대 5회)',
  })
  async createPlace(
    @Body() createDto: CreatePlaceDto,
    @Req() req: Request,
  ): Promise<Place> {
    // 인증된 사용자만 장소 등록 가능
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('장소를 등록하려면 로그인이 필요합니다.');
    }
    
    return this.placesService.createPlace(createDto, userId);
  }

  /**
   * 즐겨찾기 토글
   * - PATCH 사용 (리소스 부분 수정)
   * - 사용자 ID로 권한 확인
   */
  @Patch(':id/favorite')
  @ApiBearerAuth()
  @ApiOperation({ summary: '즐겨찾기 토글 (인증 필수)' })
  @ApiResponse({
    status: 200,
    description: '즐겨찾기 상태 변경',
    type: Place,
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
  })
  async toggleFavorite(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Place> {
    // 인증된 사용자만 즐겨찾기 토글 가능
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('즐겨찾기를 변경하려면 로그인이 필요합니다.');
    }
    
    return this.placesService.toggleFavorite(id, userId);
  }
}
