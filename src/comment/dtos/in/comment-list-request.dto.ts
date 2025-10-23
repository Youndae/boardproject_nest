import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CommentListRequestDTO {

  @ApiProperty({
    description: '일반 게시글 번호',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({value}) => (value ? Number(value) : undefined))
  @IsInt()
  boardNo?: number;

  @ApiProperty({
    description: '이미지 게시글 번호',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({value}) => (value ? Number(value) : undefined))
  @IsInt()
  imageNo?: number;

  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Transform(({value}) => (value ? Number(value) : 1))
  @Min(1)
  pageNum: number = 1;
}