import { IsArray, IsOptional, IsString, IsNumber, ArrayMaxSize, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecommendPlaceDto {
  @ApiProperty({
    description: '사용자 선호도 (최대 10개)',
    example: ['카페', '조용한', '분위기좋은'],
    isArray: true,
    maxItems: 10,
  })
  @IsArray()
  @ArrayMaxSize(10, { message: '선호도는 최대 10개까지 지정할 수 있습니다.' })
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: '각 선호도는 50자를 초과할 수 없습니다.' })
  preferences: string[];

  @ApiPropertyOptional({
    description: '위치',
    example: '강남구',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '위치는 100자를 초과할 수 없습니다.' })
  location?: string;

  @ApiPropertyOptional({
    description: '예산',
    example: 30000,
  })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({
    description: '방문 목적/상황',
    example: '데이트',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '상황 설명은 100자를 초과할 수 없습니다.' })
  occasion?: string;
}
