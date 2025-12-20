import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AiService, InterpretedQuery } from './ai.service';
import { AiCacheService } from './services/ai-cache.service';
import { PlacesService } from '../places/places.service';
import { RecommendPlaceDto } from './dto/recommend-place.dto';
import { SummarizeReviewsDto } from './dto/summarize-reviews.dto';
import { InterpretQueryDto } from './dto/interpret-query.dto';
import { ComparePlacesDto } from './dto/compare-places.dto';
import { Public } from '../../common/decorators';
import { Place } from '../../entities/place.entity';

export interface AISearchResponse {
  interpretation: InterpretedQuery;
  places: Place[];
  source: 'DB' | 'EXTERNAL';
  totalCount: number;
}

@ApiTags('ai')
@Controller('api/v1/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly placesService: PlacesService,
    private readonly aiCacheService: AiCacheService,
  ) {}

  @Post('recommend')
  @ApiOperation({ summary: 'AI 기반 장소 추천' })
  @ApiResponse({ status: HttpStatus.OK, description: '추천 성공' })
  async recommendPlaces(@Body() dto: RecommendPlaceDto) {
    return this.aiService.recommendPlaces(dto);
  }

  @Post('recommend/stream')
  @ApiOperation({ summary: 'AI 기반 장소 추천 (스트리밍)' })
  @ApiResponse({ status: HttpStatus.OK, description: '스트리밍 시작' })
  async recommendPlacesStream(
    @Body() dto: RecommendPlaceDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.aiService.recommendPlacesStream(dto)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch {
      // 에러 상세 정보는 노출하지 않음
      res.write(`data: ${JSON.stringify({ error: 'AI 추천 생성 중 오류가 발생했습니다.' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('summarize')
  @ApiOperation({ summary: '리뷰 요약' })
  @ApiResponse({ status: HttpStatus.OK, description: '요약 성공' })
  async summarizeReviews(@Body() dto: SummarizeReviewsDto) {
    const summary = await this.aiService.summarizeReviews(dto);
    return { summary };
  }

  @Post('interpret')
  @ApiOperation({ summary: '자연어 쿼리 해석' })
  @ApiResponse({ status: HttpStatus.OK, description: '해석 성공' })
  async interpretQuery(@Body() dto: InterpretQueryDto): Promise<InterpretedQuery> {
    return this.aiService.interpretQuery(dto);
  }

  @Post('interpret/stream')
  @ApiOperation({ summary: '자연어 쿼리 해석 (SSE 스트리밍, 이벤트 분리)' })
  @ApiResponse({ status: HttpStatus.OK, description: '스트리밍 시작' })
  async interpretQueryStream(@Body() dto: InterpretQueryDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const ev of this.aiService.interpretQueryStream(dto)) {
        writeEvent(ev.event, ev.data);
      }
      writeEvent('done', { ok: true });
    } catch {
      // 에러 상세 정보는 노출하지 않음
      writeEvent('error', { message: 'AI 해석 스트리밍 중 오류가 발생했습니다.' });
    } finally {
      res.end();
    }
  }

  @Post('search')
  @ApiOperation({ summary: 'AI 맞춤 검색 - 자연어 해석 후 DB에서 검색' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AI 맞춤 검색 결과' })
  async aiSearch(
    @Body() dto: InterpretQueryDto & { lat?: number; lng?: number; radius?: number; limit?: number },
  ): Promise<AISearchResponse> {
    // 1. AI로 자연어 해석
    const interpretation = await this.aiService.interpretQuery(dto);

    // 2. 해석 결과로 DB 검색
    let places = await this.placesService.searchByAICriteria({
      keywords: interpretation.keywords,
      categories: interpretation.categories,
      atmosphere: interpretation.atmosphere,
      features: interpretation.specialRequests,
      location: interpretation.location,
      lat: dto.lat,
      lng: dto.lng,
      radius: dto.radius || 5000,
      limit: dto.limit || 20,
    });

    let source: 'DB' | 'EXTERNAL' = 'DB';

    // 3. DB 결과가 부족하면 외부 검색 (폴백)
    if (places.length < 5) {
      const externalResults = await this.placesService.searchPlaces({
        query: interpretation.searchQuery,
        lat: dto.lat,
        lng: dto.lng,
        radius: dto.radius || 5000,
        limit: dto.limit || 20,
        useExternal: true,
        minRating: interpretation.minRating, // AI가 감지한 최소 평점 전달
      });
      
      // DB 결과와 외부 결과 병합 (중복 제거)
      const existingIds = new Set(places.map(p => p.id));
      const newPlaces = externalResults.filter(p => !existingIds.has(p.id));
      places = [...places, ...newPlaces].slice(0, dto.limit || 20);
      
      if (newPlaces.length > 0) {
        source = 'EXTERNAL';
      }
    }

    return {
      interpretation,
      places,
      source,
      totalCount: places.length,
    };
  }

  @Post('compare')
  @ApiOperation({ summary: '장소 비교 분석' })
  @ApiResponse({ status: HttpStatus.OK, description: '비교 성공' })
  async comparePlaces(@Body() dto: ComparePlacesDto) {
    const comparison = await this.aiService.comparePlaces(dto.places);
    return { comparison };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'AI 서비스 상태 확인' })
  @ApiResponse({ status: HttpStatus.OK, description: '정상 작동 중' })
  async checkHealth() {
    try {
      const modelStatus = await this.aiService.checkModelStatus();
      const info = this.aiService.getModelInfo();
      return {
        status: modelStatus ? 'ok' : 'warning',
        provider: info.provider,
        model: info.model,
        modelAvailable: modelStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const info = this.aiService.getModelInfo();
      return {
        status: 'error',
        provider: info.provider,
        model: info.model,
        modelAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * AI 캐시 통계 조회
   * - 토큰 절약량, 히트율 등 확인
   */
  @Get('cache/stats')
  @Public()
  @ApiOperation({ summary: 'AI 캐시 통계 조회' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '캐시 통계',
    schema: {
      example: {
        hits: 150,
        misses: 50,
        totalItems: 42,
        totalTokensSaved: 75000,
        hitRate: '75.00%',
      },
    },
  })
  getCacheStats(): { hits: number; misses: number; totalItems: number; totalTokensSaved: number; hitRate: string } {
    return this.aiCacheService.getStats();
  }

  /**
   * AI 캐시 초기화
   * - 개발/테스트 시 캐시 클리어
   */
  @Delete('cache')
  @ApiOperation({ summary: 'AI 캐시 초기화' })
  @ApiResponse({ status: HttpStatus.OK, description: '캐시 초기화 완료' })
  clearCache() {
    this.aiCacheService.clear();
    return { success: true, message: 'AI 캐시가 초기화되었습니다.' };
  }
}
