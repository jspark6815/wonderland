import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PlaceInfoDto {
  @ApiProperty({
    description: '장소 이름',
    example: '스타벅스 강남점',
  })
  name: string;

  @ApiProperty({
    description: '장소 설명',
    example: '커피 전문점, WiFi 제공, 넓은 공간',
  })
  description: string;
}

export class ComparePlacesDto {
  @ApiProperty({
    description: '비교할 장소 목록',
    type: [PlaceInfoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceInfoDto)
  places: PlaceInfoDto[];
}
