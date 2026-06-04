import { ApiProperty } from '@nestjs/swagger';
import { Board } from '#board/entities/board.entity';

export class BoardPatchDetailResponse {

  @ApiProperty({
    example: 'testTitle',
    description: '게시글 제목'
  })
  title: string;

  @ApiProperty({
    example: 'testBoardContent',
    description: '게시글 내용'
  })
  content: string;

  constructor(entity: Board) {
    this.title = entity.title;
    this.content = entity.content;
  }
}