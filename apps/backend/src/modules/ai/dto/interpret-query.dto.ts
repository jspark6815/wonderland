import { IsString, MaxLength, MinLength, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 이전 대화 컨텍스트 (AI가 맥락을 이해하도록)
 */
export class SearchContext {
  @ApiPropertyOptional({ description: '이전 검색어' })
  @IsOptional()
  @IsString()
  lastSearchQuery?: string;

  @ApiPropertyOptional({ description: '이전 검색 키워드들' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lastKeywords?: string[];

  @ApiPropertyOptional({ description: '이전 검색 카테고리들' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lastCategories?: string[];

  @ApiPropertyOptional({ description: '이전 검색 위치' })
  @IsOptional()
  @IsString()
  lastLocation?: string;

  @ApiPropertyOptional({ description: '이전 검색 분위기' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lastAtmosphere?: string[];

  @ApiPropertyOptional({ description: '이전 검색 결과 수' })
  @IsOptional()
  @IsNumber()
  lastResultCount?: number;
}

export class InterpretQueryDto {
  @ApiProperty({
    description: '자연어 검색 쿼리',
    example: '강남역 근처 분위기 좋은 카페 추천해주세요',
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @MinLength(2, { message: '검색어는 2자 이상이어야 합니다.' })
  @MaxLength(500, { message: '검색어는 500자를 초과할 수 없습니다.' })
  query: string;

  @ApiPropertyOptional({
    description: '이전 대화 컨텍스트 (후속 질문 처리용)',
    type: SearchContext,
  })
  @IsOptional()
  @Type(() => SearchContext)
  context?: SearchContext;

  @ApiPropertyOptional({
    description: '최소 평점 필터 (사용자가 명시적으로 요청한 경우)',
    example: 4.3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;
}
