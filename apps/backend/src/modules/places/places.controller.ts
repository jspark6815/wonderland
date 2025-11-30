import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { SearchPlacesDto } from './dto/search-places.dto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { Place } from '../../entities/place.entity';

@ApiTags('places')
@Controller('api/v1/places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  @ApiOperation({ summary: '장소 검색 (하이브리드)' })
  @ApiResponse({
    status: 200,
    description: '검색 결과',
    type: [Place],
  })
  async searchPlaces(@Query() searchDto: SearchPlacesDto): Promise<Place[]> {
    return this.placesService.searchPlaces(searchDto);
  }

  @Get('nearby')
  @ApiOperation({ summary: '주변 장소 검색' })
  @ApiResponse({
    status: 200,
    description: '주변 장소 목록',
    type: [Place],
  })
  async searchNearby(@Query() nearbyDto: NearbySearchDto): Promise<Place[]> {
    return this.placesService.searchNearby(nearbyDto);
  }

  @Get('popular')
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

  @Get(':id')
  @ApiOperation({ summary: '장소 상세 정보' })
  @ApiResponse({
    status: 200,
    description: '장소 상세 정보',
    type: Place,
  })
  async getPlaceDetail(@Param('id') id: string): Promise<Place> {
    return this.placesService.getPlaceDetail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '장소 등록' })
  @ApiResponse({
    status: 201,
    description: '장소 등록 완료',
    type: Place,
  })
  async createPlace(@Body() createDto: CreatePlaceDto): Promise<Place> {
    return this.placesService.createPlace(createDto);
  }

  @Put(':id/favorite')
  @ApiOperation({ summary: '즐겨찾기 토글' })
  @ApiResponse({
    status: 200,
    description: '즐겨찾기 상태 변경',
    type: Place,
  })
  async toggleFavorite(@Param('id') id: string): Promise<Place> {
    return this.placesService.toggleFavorite(id);
  }
}
