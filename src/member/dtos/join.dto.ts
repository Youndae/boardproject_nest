import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { pwRegex } from '#member/constants/validate-pattern.constants';

export class JoinDTO {

  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  userId: string;

  @IsNotEmpty()
  @IsString()
  @Matches(pwRegex, { message: '비밀번호는 영문, 숫자, 특수문자를 포함한 8 ~ 20자리여야 합니다.' })
  userPw: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 20)
  userName: string;

  @IsOptional()
  @IsString()
  nickName?: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
}