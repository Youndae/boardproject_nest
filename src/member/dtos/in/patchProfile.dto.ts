import { IsOptional, IsString, Length } from 'class-validator';

export class PatchProfileDTO {
  constructor(nickname?: string, deleteProfile?: string) {
    this.nickname = nickname;
    this.deleteProfile = deleteProfile;
  }

  @IsOptional()
  @IsString()
  @Length(2, 20)
  nickname?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  deleteProfile?: string;

  setDeleteProfile(deleteProfile: string) {
    this.deleteProfile = deleteProfile;
  }
}