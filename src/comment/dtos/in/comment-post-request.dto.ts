import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class CommentPostRequestDTO {

  @ApiProperty({
    example: 'post comment content',
    description: '댓글 내용'
  })
  @IsDefined()
  @IsString()
  commentContent: string;
}