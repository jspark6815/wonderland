import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceCategory } from '../../../entities/place.entity';

/**
 * 검색 기록 응답 DTO
 */
export class SearchHistoryResponseDto {
  @ApiProperty({ description: '검색 기록 ID' })
  id: string;

  @ApiProperty({ description: '검색어' })
  query: string;

  @ApiPropertyOptional({ description: '카테고리', enum: PlaceCategory })
  category?: PlaceCategory;

  @ApiPropertyOptional({ description: '위도' })
  latitude?: number;

  @ApiPropertyOptional({ description: '경도' })
  longitude?: number;

  @ApiProperty({ description: '검색 결과 수' })
  resultCount: number;

  @ApiProperty({ description: '검색 일시' })
  createdAt: Date;
}

/**
 * 검색 기록 조회 DTO
 */
export class GetSearchHistoryDto {
  @ApiPropertyOptional({ description: '조회할 개수', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}

