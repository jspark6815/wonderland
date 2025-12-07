import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InterpretQueryDto {
  @ApiProperty({
    description: '자연어 검색 쿼리',
    example: '강남역 근처 분위기 좋은 카페 추천해주세요',
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @MinLength(2, { message: '검색어는 2자 이상이어야 합니다.' })
  @MaxLength(500, { message: '검색어는 500자를 초과할 수 없습니다.' })
  query: string;
}
