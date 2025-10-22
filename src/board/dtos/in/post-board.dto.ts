import { IsDefined, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  boardContentDefinedMessage, boardContentNotEmptyMessage,
  boardTitleDefinedMessage,
  boardTitleLengthMessage,
} from '#board/constants/board-validate-meesage.constants';

export class PostBoardDto {

  @ApiProperty({
    description: '게시글 제목',
    example: 'testPostBoardTitle'
  })
  @IsDefined({ message: boardTitleDefinedMessage })
  @IsString()
  @Length(2, 50, { message: boardTitleLengthMessage })
  boardTitle: string;

  @ApiProperty({
    description: '게시글 내용',
    example: 'testPostBoardContent'
  })
  @IsDefined({ message: boardContentDefinedMessage })
  @IsNotEmpty({ message: boardContentNotEmptyMessage })
  @IsString()
  boardContent: string;
}