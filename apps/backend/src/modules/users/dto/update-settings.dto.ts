import { IsBoolean, IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: '알림 활성화' })
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;

  @ApiPropertyOptional({ description: '이메일 알림' })
  @IsOptional()
  @IsBoolean()
  emailNotification?: boolean;

  @ApiPropertyOptional({ description: '푸시 알림' })
  @IsOptional()
  @IsBoolean()
  pushNotification?: boolean;

  @ApiPropertyOptional({ description: '다크 모드' })
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @ApiPropertyOptional({ description: '언어 설정', example: 'ko' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '검색 기록 저장' })
  @IsOptional()
  @IsBoolean()
  saveSearchHistory?: boolean;

  @ApiPropertyOptional({ description: '개인화 추천' })
  @IsOptional()
  @IsBoolean()
  personalizedRecommendation?: boolean;

  @ApiPropertyOptional({ description: '선호 카테고리', example: ['카페', '맛집'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @ApiPropertyOptional({ description: '기본 검색 반경 (미터)', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  defaultSearchRadius?: number;
}

