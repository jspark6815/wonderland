import { IsArray, ValidateNested, IsString, MaxLength, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PlaceInfoDto {
  @ApiProperty({
    description: '장소 이름',
    example: '스타벅스 강남점',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100, { message: '장소 이름은 100자를 초과할 수 없습니다.' })
  name: string;

  @ApiPropertyOptional({
    description: '장소 설명',
    example: '커피 전문점, WiFi 제공, 넓은 공간',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '장소 설명은 500자를 초과할 수 없습니다.' })
  description?: string;

  @ApiPropertyOptional({ description: '카테고리' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '평점' })
  @IsOptional()
  rating?: number;
}

export class ComparePlacesDto {
  @ApiProperty({
    description: '비교할 장소 목록 (최소 2개, 최대 5개)',
    type: [PlaceInfoDto],
    minItems: 2,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(2, { message: '최소 2개의 장소가 필요합니다.' })
  @ArrayMaxSize(5, { message: '장소는 최대 5개까지 비교할 수 있습니다.' })
  @ValidateNested({ each: true })
  @Type(() => PlaceInfoDto)
  places: PlaceInfoDto[];
}
