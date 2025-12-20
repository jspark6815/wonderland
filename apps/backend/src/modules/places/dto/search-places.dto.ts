import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlaceCategory } from '../../../entities/place.entity';

export class SearchPlacesDto {
  @ApiProperty({
    description: '검색 쿼리',
    example: '강남역 카페',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: '카테고리 필터',
    enum: PlaceCategory,
  })
  @IsOptional()
  @IsEnum(PlaceCategory)
  category?: PlaceCategory;

  @ApiPropertyOptional({
    description: '결과 개수 제한',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '외부 API 사용 여부',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useExternal?: boolean;

  @ApiPropertyOptional({
    description: '위도 (주변 검색용)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: '경도 (주변 검색용)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    description: '검색 반경 (미터)',
    minimum: 100,
    maximum: 50000,
    default: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number;

  @ApiPropertyOptional({
    description: '최소 평점 필터 (0~5)',
    example: 4.3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;
}
