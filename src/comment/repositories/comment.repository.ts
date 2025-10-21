import { DataSource, Repository } from 'typeorm';
import { Comment } from '#comment/entities/comment.entity';
import { Injectable } from '@nestjs/common';
import { CommentListRequestDTO } from '#comment/dtos/in/comment-list-request.dto';
import { getPaginationOffset } from '#common/utils/pagination-offset.utils';
import { CommentListResponseDTO } from '#comment/dtos/out/comment-list-response.dto';
import { CommentPostRequestDTO } from '#comment/dtos/in/comment-post-request.dto';
import { CommentPostReplyRequestDTO } from '#comment/dtos/in/comment-post-reply-request.dto';

const commentAmount = 20;

@Injectable()
export class CommentRepository extends Repository<Comment>{
  constructor(private dataSource: DataSource) {
    super(Comment, dataSource.manager);
  }

  /**
   * @param commentListDTO { boardNo? number, imageNo?: number, pageNum: number = 1}
   *
   * @returns {
   *   list: CommentListResponseDTO[
   *     {
   *       commentNo: number,
   *       userId: string,
   *       commentDate: Date,
   *       commentContent: string,
   *       commentGroupNo: number,
   *       commentIndent: number,
   *       commentUpperNo: string
   *     }
   *   ],
   *   totalElements: number
   * }
   */
  async getCommentList(commentListDTO: CommentListRequestDTO): Promise<{
    list: CommentListResponseDTO[],
    totalElements: number
  }> {
    const { boardNo = null, imageNo = null, pageNum } = commentListDTO;
    const offset: number = getPaginationOffset(pageNum, commentAmount);

    const query = this.createQueryBuilder('comment')
      .select([
        'comment.commentNo',
        'comment.userId',
        'comment.commentDate',
        'comment.commentContent',
        'comment.commentGroupNo',
        'comment.commentIndent',
        'comment.commentUpperNo'
      ])
      .skip(offset)
      .take(commentAmount)
      .where('comment.boardNo =: boardNo OR comment.imageNo =: imageNo', { boardNo, imageNo })
      .orderBy('comment.commentGroupNo', 'DESC')
      .addOrderBy('comment.commentUpperNo', 'ASC');

    const [ lists, totalElements ] = await query.getManyAndCount();

    const list: CommentListResponseDTO[] = lists.map(
      (entity: Comment) => new CommentListResponseDTO(entity)
    );

    return { list, totalElements };
  }

  /**
   * @param postDTO
   * @param userId
   * @param { boardNo?: number, imageNo?: number}
   *
   * @return void
   */
  async postComment(
    postDTO: CommentPostRequestDTO,
    userId: string,
    { boardNo, imageNo }: { boardNo: number | null, imageNo: number | null}
  ): Promise<void> {
    const comment: Comment = this.create({
      boardNo: boardNo,
      imageNo: imageNo,
      userId,
      commentContent: postDTO.commentContent,
      commentIndent: 1
    });

    const saveComment: Comment = await this.save(comment);

    saveComment.commentGroupNo = saveComment.commentNo;
    saveComment.commentUpperNo = `${saveComment.commentNo}`;

    await this.save(saveComment);
  }

  /**
   * @param replyDTO
   * @param userId
   * @param { boardNo: number, imageNo?: number}
   *
   * @return void
   */
  async postReplyComment(
    replyDTO: CommentPostReplyRequestDTO,
    userId: string,
    { boardNo, imageNo }: { boardNo: number | null, imageNo: number | null }
  ): Promise<void> {
    const replyComment: Comment = this.create({
      boardNo: boardNo,
      imageNo: imageNo,
      userId,
      commentContent: replyDTO.commentContent,
      commentGroupNo: replyDTO.commentGroupNo,
      commentIndent: replyDTO.commentIndent + 1
    });

    const saveComment: Comment = await this.save(replyComment);

    saveComment.commentUpperNo = `${replyDTO.commentUpperNo},${saveComment.commentNo}`;

    await this.save(saveComment);
  }
}