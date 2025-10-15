import { ApiProperty } from '@nestjs/swagger';

export class UserStatusDTO {

  @ApiProperty({
    example: true,
    description: '로그인 여부'
  })
  loggedIn: boolean;

  @ApiProperty({
    example: 'tester',
    description: '로그인한 사용자 아이디'
  })
  uid: string;

  constructor(userId: string | null) {
    this.loggedIn = userId !== null;
    this.uid = userId ?? 'Anonymous';
  }
}