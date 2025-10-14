import { ApiProperty } from '@nestjs/swagger';
import { Board } from '#board/entities/board.entity';

export class BoardReplyDataDTO {

  @ApiProperty({
    description: '게시글 그룹 번호',
    example: 1
  })
  boardGroupNo: number;

  @ApiProperty({
    description: '게시글 상위 글 번호 목록(최상위까지)',
    example: '1,3,5,7'
  })
  boardUpperNo: string;

  @ApiProperty({
    description: '원본글 계층',
    example: 4
  })
  boardIndent: number;

  constructor(entity: Partial<Board>) {
    if(entity)
      Object.assign(this, entity);
  }
}