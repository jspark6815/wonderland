import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '사용자 이름', example: '홍길동' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @ApiPropertyOptional({ description: '자기소개', example: '카페 탐방을 좋아합니다' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({ description: '전화번호', example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

