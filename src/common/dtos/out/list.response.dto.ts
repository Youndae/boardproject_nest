import { ApiProperty } from '@nestjs/swagger';

export class ListResponse<T> {
  @ApiProperty({
    description: '리스트 응답 데이터 리스트',
    type: 'array',
    items: { type: 'object' },
  })
  items: T[];

  @ApiProperty({
    example: false,
    description: '리스트가 비어있는지 여부'
  })
  isEmpty: boolean;

  @ApiProperty({
    example: 10,
    description: '총 페이지 개수'
  })
  totalPages: number;

  @ApiProperty({
    example: 1,
    description: '현재 페이지 번호'
  })
  currentPage: number;

  constructor(items: T[], totalElements: number, amount: number, page: number) {
    this.items = items;
    this.isEmpty = items.length === 0;
    this.totalPages = totalElements > 0 ? Math.ceil(totalElements / amount) : 0;
    this.currentPage = page;
  }

  static createEmpty = <T>(page: number): ListResponse<T> =>
    new ListResponse([], 0, 0, page);
}