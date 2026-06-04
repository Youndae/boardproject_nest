import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { CommentListRequest } from '#comment/dtos/in/comment-list.request.dto';
import { CommentListResponse } from '#comment/dtos/out/comment-list.response.dto';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { PostCommentRequest } from '#comment/dtos/in/post-comment.request.dto';
import { Comment } from '#comment/entities/comment.entity';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { CommentPostReplyRequest } from '#comment/dtos/in/comment-post-reply.request.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { LoggerService } from '#config/logger/logger.service';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { CommentTarget } from '#comment/constants/comment-list-type.constants';

@Injectable()
export class CommentService {
  private readonly logger: LoggerService;

  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly originalLogger: LoggerService
  ) {
    this.logger = this.originalLogger.setContext(CommentService.name);
  }

  async getCommentListService(commentListDTO: CommentListRequest, targetBoard: CommentTarget): Promise<ListResponse<CommentListResponse>> {

    return this.commentRepository.getCommentList(commentListDTO, targetBoard);
  }

  @Transactional()
  async postCommentService(
    postDTO: PostCommentRequest,
    userId: number,
    { boardId, imageId}: { boardId?: number, imageId?: number}
  ): Promise<void> {
    const saveBoardNo: number | null = boardId ?? null;
    const saveImageNo: number | null = imageId ?? null;

    if((!saveBoardNo && !saveImageNo) || (saveBoardNo && saveImageNo)){
      this.logger.error('postCommentService :: boardNo all undefined or all exists');
      throw new BadRequestException();
    }
    
    await this.commentRepository.postComment(postDTO, userId, { boardId: saveBoardNo, imageId: saveImageNo });
  }

  @Transactional()
  async deleteCommentService(id: number, userId: number): Promise<void> {
    await this.checkWriter(id, userId);

    await this.commentRepository.deleteById(id);
  }

  @Transactional()
  async postReplyService(
    postReplyDTO: CommentPostReplyRequest,
    targetId: number,
    userId: number
  ): Promise<void> {
    const targetComment: Comment | null = await this.commentRepository.findReplyTargetCommentById(targetId);

    if(!targetComment) {
      this.logger.warn('postReplyService :: targetComment not found', { targetId, userId });
      throw new BadRequestException();
    }

    await this.commentRepository.postReplyComment(postReplyDTO, userId, targetComment);
  }

  private async checkWriter(id: number, userId: number): Promise<void> {
    const writer: number | null = await this.commentRepository.findWriterById(id);

    if(!writer) {
      this.logger.error('checkWriter :: NotFoundException', { id });
      throw new BadRequestException();
    }

    if(writer !== userId) {
      this.logger.error('checkWriter :: AccessDeniedException', { id, userId });
      throw new AccessDeniedException();
    }
  }
}
