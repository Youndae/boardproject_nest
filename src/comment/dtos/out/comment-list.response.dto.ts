import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '#comment/entities/comment.entity';

export class CommentListResponse {

  @ApiProperty({
    example: 1,
    description: '댓글 번호'
  })
  id: number;

  @ApiProperty({
    example: 'testerNickname',
    description: '작성자 닉네임'
  })
  writer: string;

  @ApiProperty({
    example: 'tester',
    description: '작성자 아이디'
  })
  writerId: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '작성일'
  })
  createdAt: Date;

  @ApiProperty({
    example: 'test comment content',
    description: '댓글 내용'
  })
  content: string;

  @ApiProperty({
    example: 1,
    description: '댓글 계층'
  })
  indent: number;

  @ApiProperty({
    example: false,
    description: '삭제 여부'
  })
  isDeleted: boolean;

  constructor(entity: Comment) {
    const deleted = entity.deletedAt === null;

    this.id = entity.id;
    this.writer = deleted ? entity.member.nickname! : "";
    this.writerId = deleted ? entity.member.userId : "";
    this.createdAt = entity.createdAt;
    this.content = deleted ? entity.content : "삭제된 댓글입니다.";
    this.indent = entity.indent;
    this.isDeleted = !deleted;
  }
}