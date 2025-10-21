import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsString, Min } from 'class-validator';

export class CommentPostReplyRequestDTO {

  @ApiProperty({
    example: 'post comment content',
    description: '댓글 내용'
  })
  @IsDefined()
  @IsString()
  commentContent: string;

  @ApiProperty({
    example: 1,
    description: '상위 댓글 그룹 번호'
  })
  @IsDefined()
  @IsInt()
  @Min(1)
  commentGroupNo: number;

  @ApiProperty({
    example: 1,
    description: '상위 댓글 계층'
  })
  @IsDefined()
  @IsInt()
  @Min(1)
  commentIndent: number;

  @ApiProperty({
    example: '1',
    description: '상위 댓글 번호 계층 경로'
  })
  @IsDefined()
  @IsString()
  commentUpperNo: string;
}