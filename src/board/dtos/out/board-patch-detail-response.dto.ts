import { ApiProperty } from '@nestjs/swagger';

export class BoardPatchDetailResponseDTO {

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
}