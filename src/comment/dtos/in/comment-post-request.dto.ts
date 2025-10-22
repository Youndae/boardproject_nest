import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import {
  commentContentDefinedMessage,
  commentContentNotEmptyMessage,
} from '#comment/constants/comment-validate-message.constants';

export class CommentPostRequestDTO {

  @ApiProperty({
    example: 'post comment content',
    description: '댓글 내용'
  })
  @IsDefined({ message: commentContentDefinedMessage })
  @IsNotEmpty({ message: commentContentNotEmptyMessage })
  @IsString()
  commentContent: string;
}