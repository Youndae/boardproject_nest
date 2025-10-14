import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PostBoardDto {

  @ApiProperty({
    description: '게시글 제목',
    example: 'testPostBoardTitle'
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  boardTitle: string;

  @ApiProperty({
    description: '게시글 내용',
    example: 'testPostBoardContent'
  })
  @IsNotEmpty()
  @IsString()
  boardContent: string;
}