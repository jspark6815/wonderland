import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceCategory } from '../../../entities/place.entity';

export class CreatePlaceDto {
  @ApiProperty({
    description: '장소명',
    example: '스타벅스 강남점',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: '설명',
    example: '넓고 쾌적한 카페',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '카테고리',
    enum: PlaceCategory,
  })
  @IsEnum(PlaceCategory)
  category: PlaceCategory;

  @ApiProperty({
    description: '주소',
    example: '서울특별시 강남구 강남대로 396',
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: '상세 주소',
    example: '2층',
  })
  @IsOptional()
  @IsString()
  detailAddress?: string;

  @ApiProperty({
    description: '위도',
    example: 37.4979,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: '경도',
    example: 127.0276,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: '전화번호',
    example: '02-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: '웹사이트',
    example: 'https://www.starbucks.co.kr',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description: '이미지 URL 목록',
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: '영업시간',
    example: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
    },
  })
  @IsOptional()
  @IsObject()
  businessHours?: {
    [key: string]: { open: string; close: string };
  };

  @ApiPropertyOptional({
    description: '태그',
    example: ['WiFi', '주차가능', '애견동반'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: '가격대',
    example: { min: 5000, max: 15000, currency: 'KRW' },
  })
  @IsOptional()
  @IsObject()
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
}
