import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, Length } from 'class-validator';
import {
  boardContentDefinedMessage,
  boardContentNotEmptyMessage,
  boardTitleDefinedMessage,
  boardTitleLengthMessage,
} from '#board/constants/board-validate-meesage.constants';

export class PostReplyRequest {

  @ApiProperty({
    description: '게시글 답변 제목',
    example: 'testReplyTitle'
  })
  @IsDefined({ message: boardTitleDefinedMessage })
  @IsString()
  @Length(2, 50, { message: boardTitleLengthMessage })
  title: string;

  @ApiProperty({
    description: '게시글 답변 내용',
    example: 'testReplyContent'
  })
  @IsDefined({ message: boardContentDefinedMessage })
  @IsNotEmpty({ message: boardContentNotEmptyMessage })
  @IsString()
  content: string;
}