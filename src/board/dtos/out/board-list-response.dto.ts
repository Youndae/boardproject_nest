import { ApiProperty } from '@nestjs/swagger';
import { Board } from '#board/entities/board.entity';

export class BoardListResponseDTO {
  @ApiProperty({
    example: 1,
    description: '게시글 번호'
  })
  boardNo: number;

  @ApiProperty({
    example: 'testTitle',
    description: '게시글 제목'
  })
  boardTitle: string;

  @ApiProperty({
    example: 'tester',
    description: '작성자'
  })
  userId: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '게시글 작성일'
  })
  boardDate: Date;

  @ApiProperty({
    example: 1,
    description: '게시글 계층'
  })
  boardIndent: number;

  constructor(
    entity: Board
  ) {
    this.boardNo = entity.boardNo;
    this.boardTitle = entity.boardTitle;
    this.userId = entity.userId;
    this.boardDate = entity.boardDate;
    this.boardIndent = entity.boardIndent;
  }
}