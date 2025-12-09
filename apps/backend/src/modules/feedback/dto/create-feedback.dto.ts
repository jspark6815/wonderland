import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreateVisitFeedbackDto {
  @ApiProperty({ description: '장소 ID' })
  @IsUUID()
  placeId: string;

  @ApiPropertyOptional({ description: '검색 기록 ID' })
  @IsOptional()
  @IsUUID()
  searchHistoryId?: string;

  @ApiProperty({ description: '실제 방문 여부' })
  @IsBoolean()
  visited: boolean;

  @ApiPropertyOptional({ description: '전체 만족도 (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({ description: '재방문 의향' })
  @IsOptional()
  @IsBoolean()
  wouldRevisit?: boolean;

  @ApiPropertyOptional({ description: '추천 의향' })
  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  // 시설 정보
  @ApiPropertyOptional({ description: '주차 가능 여부' })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({ description: '주차 정보' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  parkingInfo?: string;

  @ApiPropertyOptional({ description: 'WiFi 가능 여부' })
  @IsOptional()
  @IsBoolean()
  hasWifi?: boolean;

  @ApiPropertyOptional({ description: '콘센트 사용 가능' })
  @IsOptional()
  @IsBoolean()
  hasPowerOutlets?: boolean;

  @ApiPropertyOptional({ description: '애견 동반 가능' })
  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @ApiPropertyOptional({ description: '단체석 유무' })
  @IsOptional()
  @IsBoolean()
  hasGroupSeating?: boolean;

  @ApiPropertyOptional({ description: '개인실/룸 유무' })
  @IsOptional()
  @IsBoolean()
  hasPrivateRoom?: boolean;

  @ApiPropertyOptional({ description: '키즈존 유무' })
  @IsOptional()
  @IsBoolean()
  hasKidsZone?: boolean;

  // 분위기
  @ApiPropertyOptional({ description: '분위기 태그' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  atmosphereTags?: string[];

  @ApiPropertyOptional({ description: '소음 수준 (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  noiseLevel?: number;

  @ApiPropertyOptional({ description: '혼밥하기 좋은지' })
  @IsOptional()
  @IsBoolean()
  goodForSolo?: boolean;

  @ApiPropertyOptional({ description: '데이트하기 좋은지' })
  @IsOptional()
  @IsBoolean()
  goodForDate?: boolean;

  @ApiPropertyOptional({ description: '작업/공부하기 좋은지' })
  @IsOptional()
  @IsBoolean()
  goodForWork?: boolean;

  // 음식 관련
  @ApiPropertyOptional({ description: '디저트가 맛있는지' })
  @IsOptional()
  @IsBoolean()
  goodDessert?: boolean;

  @ApiPropertyOptional({ description: '커피가 맛있는지' })
  @IsOptional()
  @IsBoolean()
  goodCoffee?: boolean;

  @ApiPropertyOptional({ description: '음식 맛 평가 (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  foodRating?: number;

  @ApiPropertyOptional({ description: '가성비 (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  valueForMoney?: number;

  // 기타
  @ApiPropertyOptional({ description: '대기 시간 (분)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  waitTimeMinutes?: number;

  @ApiPropertyOptional({ description: '추가 코멘트' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({ description: '사용자 태그' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  userTags?: string[];
}

/**
 * 피드백 요청용 DTO (검색 후 알림용)
 */
export class PendingFeedbackDto {
  @ApiProperty({ description: '장소 ID' })
  placeId: string;

  @ApiProperty({ description: '장소명' })
  placeName: string;

  @ApiProperty({ description: '검색 기록 ID' })
  searchHistoryId: string;

  @ApiProperty({ description: '검색 시간' })
  searchedAt: Date;

  @ApiProperty({ description: '피드백 요청 가능 시간' })
  feedbackAvailableAt: Date;
}

