import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InterpretQueryDto {
  @ApiProperty({
    description: '자연어 검색 쿼리',
    example: '강남역 근처 분위기 좋은 카페 추천해주세요',
  })
  @IsString()
  query: string;
}
