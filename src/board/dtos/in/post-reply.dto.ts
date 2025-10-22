import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsNumber, IsString, Length, Min } from 'class-validator';
import {
  boardContentDefinedMessage,
  boardContentNotEmptyMessage,
  boardGroupNoDefinedMessage,
  boardGroupNoMinMessage,
  boardIndentDefinedMessage,
  boardIndentMinMessage,
  boardTitleDefinedMessage,
  boardTitleLengthMessage,
  boardUpperNoDefinedMessage,
  boardUpperNoNotEmptyMessage,
} from '#board/constants/board-validate-meesage.constants';

export class PostReplyDTO {

  @ApiProperty({
    description: '게시글 답변 제목',
    example: 'testReplyTitle'
  })
  @IsDefined({ message: boardTitleDefinedMessage })
  @IsString()
  @Length(2, 50, { message: boardTitleLengthMessage })
  boardTitle: string;

  @ApiProperty({
    description: '게시글 답변 내용',
    example: 'testReplyContent'
  })
  @IsDefined({ message: boardContentDefinedMessage })
  @IsNotEmpty({ message: boardContentNotEmptyMessage })
  @IsString()
  boardContent: string;

  @ApiProperty({
    description: '게시글 그룹 번호(최상위 글번호)',
    example: 1
  })
  @IsDefined({ message: boardGroupNoDefinedMessage })
  @IsNumber()
  @Min(1, { message: boardGroupNoMinMessage })
  boardGroupNo: number;

  @ApiProperty({
    description: '게시글 상위 글번호 목록(원본부터 최상위까지)',
    example: '1,3,5,7'
  })
  @IsDefined({ message: boardUpperNoDefinedMessage })
  @IsNotEmpty({ message: boardUpperNoNotEmptyMessage })
  @IsString()
  boardUpperNo: string;

  @ApiProperty({
    description: '원본 게시글 계층',
    example: 4
  })
  @IsDefined({ message: boardIndentDefinedMessage })
  @IsNumber()
  @Min(1, { message: boardIndentMinMessage })
  boardIndent: number;
}