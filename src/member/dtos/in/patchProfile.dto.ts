import { IsOptional, IsString, Length } from 'class-validator';

export class PatchProfileDTO {
  //test용 constructor
  constructor(nickname: string, deleteProfile: string | undefined) {
    this.nickname = nickname;
    this.deleteProfile = deleteProfile;
  }

  @IsString()
  nickname: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  deleteProfile?: string;

  setDeleteProfile(deleteProfile: string) {
    this.deleteProfile = deleteProfile;
  }
}