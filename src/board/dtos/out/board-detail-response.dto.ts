import { ApiProperty } from '@nestjs/swagger';
import { Board } from '#board/entities/board.entity';

export class BoardDetailResponseDTO {

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
    example: 'testBoardContent',
    description: '게시글 내용'
  })
  boardContent: string;

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

  constructor(entity: Partial<Board>) {
    if(entity)
      Object.assign(this, entity);
  }
}