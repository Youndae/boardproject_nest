import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class PaginationDTO {

  @ApiProperty({
    description: '검색어',
    example: 'testKeyword',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: 'boardTitle must be longer than or equal to 2 characters' })
  keyword?: string;

  @ApiProperty({
    description: '검색 타입',
    example: 't',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(
    ['t', 'c', 'tc', 'u'],
    { message: 'searchType must be one of the following values: t, c, tc, u' }
  )
  searchType?: string;

  @IsOptional()
  @IsInt()
  @Transform(({value}) => (value ? Number(value) : 1))
  @Min(1)
  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    required: false,
  })
  pageNum: number = 1;

  constructor() {
    if(!this.pageNum) this.pageNum = 1;
  }
}