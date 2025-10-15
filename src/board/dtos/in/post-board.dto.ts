import { IsDefined, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PostBoardDto {

  @ApiProperty({
    description: '게시글 제목',
    example: 'testPostBoardTitle'
  })
  @IsDefined({ message: 'boardTitle should not be null or undefined' })
  @IsString()
  @Length(2, 50, { message: 'boardTitle must be longer than or equal to 2 characters' })
  boardTitle: string;

  @ApiProperty({
    description: '게시글 내용',
    example: 'testPostBoardContent'
  })
  @IsDefined({ message: 'boardContent should not be null or undefined' })
  @IsNotEmpty({ message: 'boardContent is not empty' })
  @IsString()
  boardContent: string;
}