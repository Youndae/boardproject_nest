import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { CommentListRequestDTO } from '#comment/dtos/in/comment-list-request.dto';
import { CommentListResponseDTO } from '#comment/dtos/out/comment-list-response.dto';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { CommentPostRequestDTO } from '#comment/dtos/in/comment-post-request.dto';
import { NotFoundException } from '#common/exceptions/not-found.exception';
import { Comment } from '#comment/entities/comment.entity';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { CommentPostReplyRequestDTO } from '#comment/dtos/in/comment-post-reply-request.dto';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository
  ) {}

  /**
   * @param commentListDTO { boardNo?: number, imageNo?: number, pageNum: number = 1 }
   *
   * @returns {
   *   list: ?[],
   *   totalElements: number
   * }
   */
  async getCommentListService(commentListDTO: CommentListRequestDTO): Promise<{
    list: CommentListResponseDTO[],
    totalElements: number
  }> {
    const result: {
      list: CommentListResponseDTO[],
      totalElements: number,
    } = await this.commentRepository.getCommentList(commentListDTO);
    
    return result;
  }

  /**
   * @param postDTO { content: string }
   * @param userId
   * @param { boardNo?: number, imageNo?: number }
   *
   * @return void
   */
  @Transactional()
  async postCommentListService(
    postDTO: CommentPostRequestDTO, 
    userId: string,
    { boardNo, imageNo}: { boardNo?: number, imageNo?: number}
  ): Promise<void> {
    const saveBoardNo: number | null = boardNo ?? null;
    const saveImageNo: number | null = imageNo ?? null;
    
    await this.commentRepository.postComment(postDTO, userId, { boardNo: saveBoardNo, imageNo: saveImageNo });
  }

  /**
   * @param commentNo
   * @param userId
   *
   * @return void
   */
  async deleteCommentService(commentNo: number, userId: string): Promise<void> {
    const comment: Comment | null = await this.commentRepository.findOne({ where: { commentNo } });

    if(!comment)
      throw new NotFoundException();

    if(comment.userId !== userId)
      throw new AccessDeniedException();

    await this.commentRepository.delete({ commentNo });
  }

  /**
   * @param postReplyDTO {
   *   commentContent: string,
   *   commentGroupNo: number,
   *   commentIndent: number,
   *   commentUpperNo: string
   * }
   * @param userId
   * @param { boardNo?: number, imageNo?: number }
   *
   * @return void
   */
  @Transactional()
  async postReplyService(
    postReplyDTO: CommentPostReplyRequestDTO,
    userId: string,
    { boardNo, imageNo }: { boardNo?: number, imageNo?: number }
  ): Promise<void> {
    const saveBoardNo: number | null = boardNo ?? null;
    const saveImageNo: number | null = imageNo ?? null;

    await this.commentRepository.postReplyComment(postReplyDTO, userId, { boardNo: saveBoardNo, imageNo: saveImageNo });
  }
}
