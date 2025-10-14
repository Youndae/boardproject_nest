import { ApiProperty } from '@nestjs/swagger';

export class PaginationDTO {

  @ApiProperty({
    description: '검색어',
    example: 'testKeyword',
    required: false,
  })
  keyword?: string;

  @ApiProperty({
    description: '검색 타입',
    example: 't',
    required: false,
  })
  searchType?: string;

  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    required: false,
  })
  pageNum?: number;

  constructor() {
    if(!this.pageNum) this.pageNum = 1;
  }
}