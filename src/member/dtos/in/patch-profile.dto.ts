import { IsDefined, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { nickNameNotEmptyMessage } from '#member/constants/member-validate-message.constants';

export class PatchProfileDto {

  constructor(nickname?: string, deleteProfile?: string) {
    this.nickname = nickname;
    this.deleteProfile = deleteProfile;
  }

  @IsOptional()
  @IsNotEmpty({ message: nickNameNotEmptyMessage })
  @IsString()
  @Length(2, 50, { message: nickNameNotEmptyMessage })
  nickname?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  deleteProfile?: string;

  setDeleteProfile(deleteProfile: string) {
    this.deleteProfile = deleteProfile;
  }
}