import { ApiProperty } from '@nestjs/swagger';
import { Board } from '#board/entities/board.entity';

export class BoardDetailResponse {

  @ApiProperty({
    example: 'testTitle',
    description: '게시글 제목'
  })
  title: string;

  @ApiProperty({
    example: 'testerNickname',
    description: '작성자 닉네임'
  })
  writer: string;

  @ApiProperty({
    example: 'tester',
    description: '작성자 아이디. 프론트에서 본인여부 비교 대상'
  })
  writerId: string;

  @ApiProperty({
    example: 'testBoardContent',
    description: '게시글 내용'
  })
  content: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '게시글 작성일'
  })
  createdAt: Date;

  constructor(entity: Board) {
    this.title = entity.title;
    this.writer = entity.member.nickname!;
    this.writerId = entity.member.userId;
    this.content = entity.content;
    this.createdAt = entity.createdAt;
  }
}