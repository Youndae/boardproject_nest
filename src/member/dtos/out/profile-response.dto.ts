export class ProfileResponseDto {
  nickName: string | null;
  profileThumbnail: string | null;

  constructor(nickName: string | null | undefined, profileThumbnail: string | null | undefined) {
    this.nickName = nickName ?? null;
    this.profileThumbnail = profileThumbnail ?? null;
  }
}