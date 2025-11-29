import { IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlaceCategory } from '../../../entities/place.entity';

export class NearbySearchDto {
  @ApiProperty({
    description: '위도',
    example: 37.5665,
  })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({
    description: '경도',
    example: 126.9780,
  })
  @Type(() => Number)
  @IsNumber()
  lng: number;

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
}
