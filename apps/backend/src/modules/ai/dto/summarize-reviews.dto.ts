import { IsArray, IsString, ArrayMaxSize, MaxLength, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SummarizeReviewsDto {
  @ApiProperty({
    description: '요약할 리뷰 목록 (최소 1개, 최대 50개)',
    example: [
      '카페 분위기가 정말 좋아요. 커피도 맛있고 사장님도 친절하세요.',
      '조용하고 아늑한 공간입니다. 디저트가 특히 맛있어요.',
      '주차가 불편하고 가격이 비싼 편이지만 만족스러웠어요.',
    ],
    isArray: true,
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개의 리뷰가 필요합니다.' })
  @ArrayMaxSize(50, { message: '리뷰는 최대 50개까지 요약할 수 있습니다.' })
  @IsString({ each: true })
  @MaxLength(2000, { each: true, message: '각 리뷰는 2000자를 초과할 수 없습니다.' })
  reviews: string[];
}
