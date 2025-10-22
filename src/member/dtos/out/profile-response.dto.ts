import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {

  @ApiProperty({
    example: 'testerNickname',
    description: '닉네임'
  })
  nickName: string | null;

  @ApiProperty({
    example: 'profile/20251017214810002_uuid.jpg',
    description: '프로필 이미지명'
  })
  profileThumbnail: string | null;

  constructor(nickName: string | null | undefined, profileThumbnail: string | null | undefined) {
    this.nickName = nickName ?? null;
    this.profileThumbnail = profileThumbnail ?? null;
  }
}