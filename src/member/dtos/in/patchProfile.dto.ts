import { IsOptional, IsString, Length } from 'class-validator';

export class PatchProfileDTO {

  @IsOptional()
  @IsString()
  @Length(2, 20)
  nickname: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  deleteProfile?: string;
}