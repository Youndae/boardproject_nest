import { DataSource, Repository } from 'typeorm';
import { Comment } from '#comment/entities/comment.entity';
import { Injectable } from '@nestjs/common';
import { CommentListRequest } from '#comment/dtos/in/comment-list.request.dto';
import { getPaginationOffset } from '#common/utils/pagination-offset.utils';
import { CommentListResponse } from '#comment/dtos/out/comment-list.response.dto';
import { PostCommentRequest } from '#comment/dtos/in/post-comment.request.dto';
import { CommentPostReplyRequest } from '#comment/dtos/in/comment-post-reply.request.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { CommentTarget } from '#comment/constants/comment-list-type.constants';

@Injectable()
export class CommentRepository extends Repository<Comment>{
  constructor(private dataSource: DataSource) {
    super(Comment, dataSource.manager);
  }

  async getCommentList(commentListDTO: CommentListRequest, targetBoard: CommentTarget): Promise<ListResponse<CommentListResponse>> {
    const { id, page } = commentListDTO;
    const commentAmount: number = PAGE_AMOUNT.COMMENT;
    const offset: number = getPaginationOffset(page, commentAmount);

    const query = this.createQueryBuilder('comment')
      .withDeleted()
      .leftJoinAndSelect('comment.member', 'member')
      .select([
        'comment.id',
        'member.userId',
        'member.nickname',
        'comment.createdAt',
        'comment.content',
        'comment.indent',
        'comment.deletedAt',
        'comment.groupNo',
        'comment.upperNo'
      ])
      .skip(offset)
      .take(commentAmount)
      .where(`comment.${targetBoard} = :id`, { id })
      .orderBy('comment.groupNo', 'DESC')
      .addOrderBy('comment.upperNo', 'ASC');

    const [ lists, totalElements ] = await query.getManyAndCount();

    const list: CommentListResponse[] = lists.map(
      (entity: Comment) => new CommentListResponse(entity)
    );

    return new ListResponse(list, totalElements, commentAmount, page);
  }

  async postComment(
    postDTO: PostCommentRequest,
    userId: number,
    { boardId, imageId }: { boardId: number | null, imageId: number | null}
  ): Promise<void> {
    const comment: Comment = this.create({
      boardId: boardId,
      imageId: imageId,
      userId,
      content: postDTO.content,
      indent: 0
    });

    const saveComment: Comment = await this.save(comment);

    saveComment.groupNo = saveComment.id;
    saveComment.upperNo = `${saveComment.id}`;

    await this.save(saveComment);
  }

  async postReplyComment(
    replyDTO: CommentPostReplyRequest,
    userId: number,
    targetComment: Comment
  ): Promise<void> {
    const replyComment: Comment = this.create({
      boardId: targetComment.boardId,
      imageId: targetComment.imageId,
      userId,
      content: replyDTO.content,
      groupNo: targetComment.groupNo,
      indent: targetComment.indent + 1
    });

    const saveComment: Comment = await this.save(replyComment);

    saveComment.upperNo = `${targetComment.upperNo},${saveComment.id}`;

    await this.save(saveComment);
  }

  async findReplyTargetCommentById(targetId: number): Promise<Comment | null> {
    return await this.createQueryBuilder('comment')
      .select([
        'comment.groupNo',
        'comment.upperNo',
        'comment.indent',
        'comment.boardId',
        'comment.imageId',
      ])
      .where({ id: targetId })
      .getOne();
  }

  async findWriterById(id: number): Promise<number | null> {
    const comment = await this.createQueryBuilder('comment')
      .select(['comment.userId'])
      .where({ id })
      .getOne();

    return comment ? comment.userId : null;
  }

  async deleteById(id: number): Promise<void> {
    await this.softDelete(id);
  }
}