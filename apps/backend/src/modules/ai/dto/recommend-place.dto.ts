import { IsArray, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecommendPlaceDto {
  @ApiProperty({
    description: '사용자 선호도',
    example: ['카페', '조용한', '분위기좋은'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  preferences: string[];

  @ApiPropertyOptional({
    description: '위치',
    example: '강남구',
  })
  @IsOptional()
  @IsString()
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
  })
  @IsOptional()
  @IsString()
  occasion?: string;
}
