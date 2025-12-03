import { IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlaceCategory } from '../../../entities/place.entity';

export class BoundsSearchDto {
  @ApiProperty({
    description: '남서쪽 위도 (지도 영역의 남쪽 경계)',
    example: 37.4500,
  })
  @Type(() => Number)
  @IsNumber()
  south: number;

  @ApiProperty({
    description: '북동쪽 위도 (지도 영역의 북쪽 경계)',
    example: 37.5500,
  })
  @Type(() => Number)
  @IsNumber()
  north: number;

  @ApiProperty({
    description: '남서쪽 경도 (지도 영역의 서쪽 경계)',
    example: 126.9000,
  })
  @Type(() => Number)
  @IsNumber()
  west: number;

  @ApiProperty({
    description: '북동쪽 경도 (지도 영역의 동쪽 경계)',
    example: 127.1000,
  })
  @Type(() => Number)
  @IsNumber()
  east: number;

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
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: '외부 API 사용 여부',
    default: true,
  })
  @IsOptional()
  useExternal?: boolean;
}

