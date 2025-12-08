import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsEnum, 
  IsArray, 
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  IsUrl,
  ArrayMaxSize,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlaceCategory } from '../../../entities/place.entity';

/**
 * 영업시간 항목 DTO
 */
class BusinessHourItemDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: '시간 형식은 HH:mm이어야 합니다' })
  open: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: '시간 형식은 HH:mm이어야 합니다' })
  close: string;
}

/**
 * 가격대 DTO
 */
class PriceRangeDto {
  @IsNumber()
  @Min(0)
  min: number;

  @IsNumber()
  @Min(0)
  max: number;

  @IsString()
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/, { message: '통화 코드는 3자리 대문자여야 합니다 (예: KRW, USD)' })
  currency: string;
}

export class CreatePlaceDto {
  @ApiProperty({
    description: '장소명 (2-100자)',
    example: '스타벅스 강남점',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: '장소명은 필수입니다' })
  @MinLength(2, { message: '장소명은 최소 2자 이상이어야 합니다' })
  @MaxLength(100, { message: '장소명은 최대 100자까지 가능합니다' })
  @Matches(/^[가-힣a-zA-Z0-9\s\-_.&'()]+$/, { 
    message: '장소명에 허용되지 않은 특수문자가 포함되어 있습니다' 
  })
  name: string;

  @ApiPropertyOptional({
    description: '설명 (최대 2000자)',
    example: '넓고 쾌적한 카페',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: '설명은 최대 2000자까지 가능합니다' })
  description?: string;

  @ApiProperty({
    description: '카테고리 (필수)',
    enum: PlaceCategory,
    enumName: 'PlaceCategory',
  })
  @IsEnum(PlaceCategory, { message: '유효한 카테고리를 선택해주세요' })
  category: PlaceCategory;

  @ApiProperty({
    description: '주소 (5-200자)',
    example: '서울특별시 강남구 강남대로 396',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: '주소는 필수입니다' })
  @MinLength(5, { message: '주소는 최소 5자 이상이어야 합니다' })
  @MaxLength(200, { message: '주소는 최대 200자까지 가능합니다' })
  address: string;

  @ApiPropertyOptional({
    description: '상세 주소 (최대 100자)',
    example: '2층',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '상세 주소는 최대 100자까지 가능합니다' })
  detailAddress?: string;

  @ApiProperty({
    description: '위도 (-90 ~ 90)',
    example: 37.4979,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: '위도는 숫자여야 합니다' })
  @Min(-90, { message: '위도는 -90 이상이어야 합니다' })
  @Max(90, { message: '위도는 90 이하여야 합니다' })
  latitude: number;

  @ApiProperty({
    description: '경도 (-180 ~ 180)',
    example: 127.0276,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: '경도는 숫자여야 합니다' })
  @Min(-180, { message: '경도는 -180 이상이어야 합니다' })
  @Max(180, { message: '경도는 180 이하여야 합니다' })
  longitude: number;

  @ApiPropertyOptional({
    description: '전화번호 (한국 전화번호 형식)',
    example: '02-1234-5678',
    pattern: '^(0[2-6][0-4]?-?\\d{3,4}-?\\d{4})|(01[016789]-?\\d{3,4}-?\\d{4})$',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '전화번호는 최대 20자까지 가능합니다' })
  @Matches(/^(0[2-6][0-4]?-?\d{3,4}-?\d{4})|(01[016789]-?\d{3,4}-?\d{4})$/, { 
    message: '올바른 전화번호 형식이 아닙니다 (예: 02-1234-5678, 010-1234-5678)' 
  })
  phone?: string;

  @ApiPropertyOptional({
    description: '웹사이트 URL',
    example: 'https://www.starbucks.co.kr',
  })
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다' })
  @MaxLength(500, { message: 'URL은 최대 500자까지 가능합니다' })
  website?: string;

  @ApiPropertyOptional({
    description: '이미지 URL 목록 (최대 10개)',
    example: ['https://example.com/image1.jpg'],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: '이미지는 최대 10개까지 등록 가능합니다' })
  @IsUrl({}, { each: true, message: '모든 이미지는 올바른 URL 형식이어야 합니다' })
  @MaxLength(500, { each: true, message: '각 이미지 URL은 최대 500자까지 가능합니다' })
  images?: string[];

  @ApiPropertyOptional({
    description: '영업시간 (요일별)',
    example: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourItemDto)
  businessHours?: Record<string, BusinessHourItemDto>;

  @ApiPropertyOptional({
    description: '태그 (최대 20개, 각 태그 최대 30자)',
    example: ['WiFi', '주차가능', '애견동반'],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: '태그는 최대 20개까지 등록 가능합니다' })
  @IsString({ each: true })
  @MaxLength(30, { each: true, message: '각 태그는 최대 30자까지 가능합니다' })
  @Matches(/^[가-힣a-zA-Z0-9\s\-_]+$/, { 
    each: true, 
    message: '태그에 허용되지 않은 특수문자가 포함되어 있습니다' 
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: '가격대',
    example: { min: 5000, max: 15000, currency: 'KRW' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;
}
