import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AiService, InterpretedQuery } from './ai.service';
import { RecommendPlaceDto } from './dto/recommend-place.dto';
import { SummarizeReviewsDto } from './dto/summarize-reviews.dto';
import { InterpretQueryDto } from './dto/interpret-query.dto';
import { ComparePlacesDto } from './dto/compare-places.dto';
import { Public } from '../../common/decorators';

@ApiTags('ai')
@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
      return {
        status: modelStatus ? 'ok' : 'warning',
        model: 'llama3.2:3b',
        modelAvailable: modelStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        model: 'llama3.2:3b',
        modelAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
