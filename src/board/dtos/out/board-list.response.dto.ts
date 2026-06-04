import { ApiProperty } from '@nestjs/swagger';
import { Board } from '#board/entities/board.entity';

export class BoardListResponse {
  @ApiProperty({
    example: 1,
    description: '게시글 번호'
  })
  id: number;

  @ApiProperty({
    example: 'testTitle',
    description: '게시글 제목'
  })
  title: string;

  @ApiProperty({
    example: 'tester',
    description: '작성자'
  })
  writer: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '게시글 작성일'
  })
  createdAt: Date;

  @ApiProperty({
    example: 1,
    description: '게시글 계층'
  })
  indent: number;

  constructor(
    entity: Board
  ) {
    this.id = entity.id;
    this.title = entity.title;
    this.writer = entity.member.nickname!;
    this.createdAt = entity.createdAt;
    this.indent = entity.indent;
  }
}