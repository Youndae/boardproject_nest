import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Length } from 'class-validator';

export class PostReplyDTO {

  @ApiProperty({
    description: '게시글 답변 제목',
    example: 'testReplyTitle'
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  boardTitle: string;

  @ApiProperty({
    description: '게시글 답변 내용',
    example: 'testReplyContent'
  })
  @IsNotEmpty()
  @IsString()
  boardContent: string;

  @ApiProperty({
    description: '게시글 그룹 번호(최상위 글번호)',
    example: 1
  })
  @IsNotEmpty()
  @IsNumber()
  boardGroupNo: number;

  @ApiProperty({
    description: '게시글 상위 글번호 목록(원본부터 최상위까지)',
    example: '1,3,5,7'
  })
  @IsNotEmpty()
  @IsString()
  boardUpperNo: string;

  @ApiProperty({
    description: '원본 게시글 계층',
    example: 4
  })
  @IsNotEmpty()
  @IsNumber()
  boardIndent: number;
}