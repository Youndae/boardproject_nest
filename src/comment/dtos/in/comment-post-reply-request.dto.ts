import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import {
  commentContentDefinedMessage,
  commentContentNotEmptyMessage,
  commentGroupNoDefinedMessage,
  commentGroupNoMinMessage,
  commentIndentDefinedMessage,
  commentIndentMinMessage, commentUpperNoDefinedMessage, commentUpperNoNotEmptyMessage,
} from '#comment/constants/comment-validate-message.constants';

export class CommentPostReplyRequestDTO {

  @ApiProperty({
    example: 'post comment content',
    description: '댓글 내용'
  })
  @IsDefined({ message: commentContentDefinedMessage })
  @IsNotEmpty({ message: commentContentNotEmptyMessage })
  @IsString()
  commentContent: string;

  @ApiProperty({
    example: 1,
    description: '상위 댓글 그룹 번호'
  })
  @IsDefined({ message: commentGroupNoDefinedMessage })
  @IsInt()
  @Min(1, { message: commentGroupNoMinMessage })
  commentGroupNo: number;

  @ApiProperty({
    example: 1,
    description: '상위 댓글 계층'
  })
  @IsDefined({ message: commentIndentDefinedMessage })
  @IsInt()
  @Min(1, { message: commentIndentMinMessage })
  commentIndent: number;

  @ApiProperty({
    example: '1',
    description: '상위 댓글 번호 계층 경로'
  })
  @IsDefined({ message: commentUpperNoDefinedMessage })
  @IsNotEmpty({ message: commentUpperNoNotEmptyMessage })
  @IsString()
  commentUpperNo: string;
}