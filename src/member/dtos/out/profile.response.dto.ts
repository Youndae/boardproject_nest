import { ApiProperty } from '@nestjs/swagger';
import { Member } from '#member/entities/member.entity';
import { findSuffixType } from '#member/constants/member-mail.constants';

export class ProfileResponse {

  @ApiProperty({
    example: 'testerNickname',
    description: '닉네임'
  })
  nickname: string;

  @ApiProperty({
    example: 'tester',
    description: '이메일 @ 전까지의 앞부분'
  })
  mailPrefix: string;

  @ApiProperty({
    example: '@tester.com',
    description: '이메일 뒷부분'
  })
  mailSuffix: string;

  @ApiProperty({
    example: 'naver',
    description: '정의되어 있는 메일 주소 타입. 직접 입력의 경우 none'
  })
  mailType: string;

  @ApiProperty({
    example: '20251017214810002_uuid.jpg',
    description: '프로필 이미지명'
  })
  profile: string | null;

  constructor(member: Member) {
    const splitMail = member.email.split('@');
    const suffix = splitMail[1].substring(0, splitMail[1].indexOf('.'));
    const type = findSuffixType(suffix);

    this.nickname = member.nickname!;
    this.mailPrefix = splitMail[0];
    this.mailSuffix = splitMail[1];
    this.mailType = type;
    this.profile = member.profile;
  }
}