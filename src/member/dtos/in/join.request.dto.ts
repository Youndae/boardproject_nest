import { IsDefined, IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { pwRegex } from '#member/constants/validate-pattern.constants';
import {
  emailDefinedMessage,
  emailNotEmptyMessage,
  nickNameLengthMessage,
  nickNameNotEmptyMessage,
  userIdDefinedMessage,
  userIdLengthMessage,
  userIdNotEmptyMessage,
  userNameDefinedMessage, userNameLengthMessage,
  userNameNotEmptyMessage,
  userPwDefinedMessage,
  userPwMatchesMessage,
  userPwNotEmptyMessage,
} from '#member/constants/member-validate-message.constants';

export class JoinRequest {

  @IsDefined({ message: userIdDefinedMessage })
  @IsNotEmpty({ message: userIdNotEmptyMessage })
  @IsString()
  @Length(2, 50, { message: userIdLengthMessage })
  userId: string;

  @IsDefined({ message: userPwDefinedMessage })
  @IsNotEmpty({ message: userPwNotEmptyMessage })
  @IsString()
  @Matches(pwRegex, { message: userPwMatchesMessage })
  password: string;

  @IsDefined({ message: userNameDefinedMessage })
  @IsNotEmpty({ message: userNameNotEmptyMessage })
  @IsString()
  @Length(2, 20, { message: userNameLengthMessage })
  userName: string;

  @IsOptional()
  @IsNotEmpty({ message: nickNameNotEmptyMessage })
  @IsString()
  @Length(2, 20, { message: nickNameLengthMessage })
  nickname: string;

  @IsDefined({ message: emailDefinedMessage })
  @IsNotEmpty({ message: emailNotEmptyMessage })
  @IsString()
  @IsEmail()
  email: string;
}