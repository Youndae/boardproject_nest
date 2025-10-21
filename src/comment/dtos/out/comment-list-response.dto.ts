import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '#comment/entities/comment.entity';

export class CommentListResponseDTO {

  @ApiProperty({
    example: 1,
    description: '댓글 번호'
  })
  commentNo: number;

  @ApiProperty({
    example: 'tester',
    description: '작성자'
  })
  userId: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '작성일'
  })
  commentDate: Date;

  @ApiProperty({
    example: 'test comment content',
    description: '댓글 내용'
  })
  commentContent: string;

  @ApiProperty({
    example: 1,
    description: '댓글 그룹 번호'
  })
  commentGroupNo: number;

  @ApiProperty({
    example: 1,
    description: '댓글 계층'
  })
  commentIndent: number;

  @ApiProperty({
    example: '1',
    description: '최상위부터 자신까지 게시글 번호 경로'
  })
  commentUpperNo: string;

  constructor(entity: Comment) {
    this.commentNo = entity.commentNo;
    this.userId = entity.userId;
    this.commentDate = entity.commentDate;
    this.commentContent = entity.commentContent;
    this.commentGroupNo = entity.commentGroupNo;
    this.commentIndent = entity.commentIndent;
    this.commentUpperNo = entity.commentUpperNo;
  }
}