import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SummarizeReviewsDto {
  @ApiProperty({
    description: '요약할 리뷰 목록',
    example: [
      '카페 분위기가 정말 좋아요. 커피도 맛있고 사장님도 친절하세요.',
      '조용하고 아닁한 공간입니다. 디저트가 특히 맛있어요.',
      '주차가 불편하고 가격이 비싼 편이지만 만족스러웠어요.',
    ],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  reviews: string[];
}
