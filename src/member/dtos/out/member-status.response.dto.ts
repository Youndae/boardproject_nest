import { ApiProperty } from '@nestjs/swagger';

export class MemberStatusResponse {
  @ApiProperty({
    example: 'tester',
    description: '사용자 아이디'
  })
  userId: string;

  @ApiProperty({
    example: 'ROLE_ADMIN',
    description: '사용자 권한'
  })
  role: string;


  constructor(
    userId: string,
    role: string
  ) {
    this.userId = userId;
    this.role = role;
  }
}