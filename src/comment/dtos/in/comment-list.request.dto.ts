import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CommentListRequest {

  @ApiProperty({
    description: '게시글 번호',
    example: 1,
    required: false,
  })
  @IsDefined()
  @Transform(({value}) => (value ? Number(value) : undefined))
  @IsInt()
  id: number;

  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Transform(({value}) => (value ? Number(value) : 1))
  @Min(1)
  page: number = 1;
}