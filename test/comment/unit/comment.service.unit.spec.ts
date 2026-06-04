import { CommentService } from '#comment/services/comment.service';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '#config/logger/logger.service';
import { Comment } from '#comment/entities/comment.entity';
import { PostCommentRequest } from '#comment/dtos/in/post-comment.request.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { CommentPostReplyRequest } from '#comment/dtos/in/comment-post-reply.request.dto';

jest.mock('typeorm-transactional', () => ({
  Transactional: () => (target: any, key: string, descriptor: PropertyDescriptor) => descriptor,
}))

describe('commentService unitTest', () => {
  let commentService: CommentService;
  let commentRepository: Partial<Record<keyof CommentRepository, jest.Mock>>;

  beforeEach(async () => {
    commentRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
      getCommentList: jest.fn(),
      postComment: jest.fn(),
      postReplyComment: jest.fn(),
      findReplyTargetCommentById: jest.fn(),
      findWriterById: jest.fn(),
      deleteById: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: CommentRepository, useValue: commentRepository },
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setContext: jest.fn().mockReturnThis()
          },
        },
      ]
    })
      .compile();

    commentService = moduleFixture.get<CommentService>(CommentService);
    jest.clearAllMocks();
  })

  describe('postCommentService', () => {
    const postDTO: PostCommentRequest = new PostCommentRequest();
    postDTO.content = 'testComment';
    it('boardId, imageId가 모두 존재하는 경우', async () => {
      await expect(commentService.postCommentService(postDTO, 1, { boardId: 1, imageId: 1}))
        .rejects
        .toThrow(BadRequestException);

      expect(commentRepository.postComment).not.toHaveBeenCalled();
    })

    it('boardId, imageId가 모두 존재하지 않는 경우', async () => {
      await expect(commentService.postCommentService(postDTO, 1, {}))
        .rejects
        .toThrow(BadRequestException);

      expect(commentRepository.postComment).not.toHaveBeenCalled();
    })
  })

  describe('deleteCommentService', () => {
    it('데이터가 없는 경우', async () => {
      commentRepository.findWriterById?.mockResolvedValue(null);

      await expect(commentService.deleteCommentService(1, 1))
        .rejects
        .toThrow(BadRequestException);

      expect(commentRepository.delete).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const comment: Comment = new Comment();
      comment.userId = 2;

      commentRepository.findWriterById?.mockResolvedValue(comment);

      await expect(commentService.deleteCommentService(comment.id, 1))
        .rejects
        .toThrow(AccessDeniedException);

      expect(commentRepository.delete).not.toHaveBeenCalled();
    })
  });

  describe('postReplyService', () => {
    it('상위 댓글 데이터가 없는 경우', async () => {
      commentRepository.findReplyTargetCommentById?.mockResolvedValue(null);
      const replyDTO: CommentPostReplyRequest = new CommentPostReplyRequest();
      replyDTO.content = 'testReplyContent';

      await expect(commentService.postReplyService(replyDTO, 1, 1))
        .rejects
        .toThrow(BadRequestException);

      expect(commentRepository.postReplyComment).not.toHaveBeenCalled();
    })
  })
});