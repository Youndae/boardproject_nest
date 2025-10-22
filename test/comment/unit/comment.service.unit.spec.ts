import { CommentService } from '#comment/services/comment.service';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '#config/logger/logger.service';
import { Comment } from '#comment/entities/comment.entity';

describe('commentService unitTest', () => {
  let commentService: CommentService;
  let commentRepository: Partial<Record<keyof CommentRepository, jest.Mock>>;

  beforeEach(async () => {
    commentRepository = {
      findOne: jest.fn(),
      delete: jest.fn()
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: CommentRepository, useValue: commentRepository },
        { provide: LoggerService, useValue: { info: jest.fn(), error: jest.fn() } }
      ]
    })
      .compile();

    commentService = moduleFixture.get<CommentService>(CommentService);
    jest.clearAllMocks();
  })

  describe('deleteCommentService', () => {
    it('정상 처리', async () => {
      const comment: Comment = new Comment();
      comment.commentNo = 1;
      comment.boardNo = 1;
      comment.imageNo = null;
      comment.userId = 'tester';
      comment.commentContent = 'testCommentContent';
      comment.commentDate = new Date();
      comment.commentGroupNo = 1;
      comment.commentUpperNo = '1';
      comment.commentIndent = 1;
      (commentRepository.findOne as jest.Mock)
        .mockResolvedValue(comment);

      await commentService.deleteCommentService(comment.commentNo, comment.userId);

      expect(commentRepository.delete).toHaveBeenCalled();
    });

    it('데이터가 없는 경우', async () => {
      (commentRepository.findOne as jest.Mock)
        .mockResolvedValue(null);

      await expect(commentService.deleteCommentService(1, 'tester'))
        .rejects
        .toThrow('NOT_FOUND');

      expect(commentRepository.delete).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const comment: Comment = new Comment();
      comment.commentNo = 1;
      comment.boardNo = 1;
      comment.imageNo = null;
      comment.userId = 'tester';
      comment.commentContent = 'testCommentContent';
      comment.commentDate = new Date();
      comment.commentGroupNo = 1;
      comment.commentUpperNo = '1';
      comment.commentIndent = 1;
      (commentRepository.findOne as jest.Mock)
        .mockResolvedValue(comment);

      await expect(commentService.deleteCommentService(comment.commentNo, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');

      expect(commentRepository.delete).not.toHaveBeenCalled();
    })
  });
});