import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: '이메일 주소',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'Password123!',
  })
  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해주세요.' })
  password: string;
}

