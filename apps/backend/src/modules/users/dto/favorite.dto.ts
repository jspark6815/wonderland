import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddFavoriteDto {
  @ApiProperty({ description: '장소 ID' })
  @IsUUID()
  placeId: string;

  @ApiPropertyOptional({ description: '메모', example: '분위기 좋은 곳' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @ApiPropertyOptional({ description: '폴더/그룹', example: '데이트' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  folder?: string;
}

export class UpdateFavoriteDto {
  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @ApiPropertyOptional({ description: '폴더/그룹' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  folder?: string;
}

