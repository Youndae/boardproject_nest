import { BoardService } from '#board/services/board.service';
import { BoardRepository } from '#board/repositories/board.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '#config/logger/logger.service';
import { Board } from '#board/entities/board.entity';
import { BoardPatchDetailResponse } from '#board/dtos/out/board-patch-detail.response.dto';
import { PostBoardRequest } from '#board/dtos/in/post-board.request.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { PostReplyRequest } from '#board/dtos/in/post-reply.request.dto';

jest.mock('typeorm-transactional', () => ({
  Transactional: () => (target: any, key: string, descriptor: PropertyDescriptor) => descriptor,
}))

describe('boardService unitTest', () => {
  let boardService: BoardService;
  let boardRepository: Partial<Record<keyof BoardRepository, jest.Mock>>;

  const boardAmount: number = PAGE_AMOUNT.BOARD;

  beforeEach(async () => {
    boardRepository = {
      getBoardList: jest.fn(),
      getBoardDetail: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      postBoard: jest.fn(),
      findById: jest.fn(),
      postReply: jest.fn(),
      patchBoard: jest.fn(),
      findWriterById: jest.fn(),
      findPatchDetailById: jest.fn(),
      deleteById: jest.fn(),
      deleteByGroupNo: jest.fn(),
      deleteByPath: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        { provide: BoardRepository, useValue: boardRepository },
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

    boardService = moduleFixture.get<BoardService>(BoardService);
    jest.clearAllMocks();
  });

  describe('getDetailService', () => {
    it('데이터가 없는 경우', async () => {
      boardRepository.getBoardDetail?.mockResolvedValue(null);

      await expect(boardService.getDetailService(3567))
        .rejects.toThrow(BadRequestException);
    })
  });

  describe('getBoardPatchDataService', () => {
    it('정상 조회', async () => {
      const board: Board = new Board();
      board.userId = 1;
      board.title = 'testTitle';
      board.content = 'testContent';

      boardRepository.findPatchDetailById?.mockResolvedValue(board);

      const result: BoardPatchDetailResponse = await boardService.getBoardPatchDataService(1, 1);

      expect(result).not.toBeNull();
      expect(result.title).toBe(board.title);
      expect(result.content).toBe(board.content);
    })

    it('데이터가 없는 경우', async () => {
      boardRepository.findPatchDetailById?.mockResolvedValue(null);

      await expect(boardService.getBoardPatchDataService(1, 1))
        .rejects
        .toThrow(BadRequestException);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const board: Board = new Board();
      board.userId = 2;
      board.title = 'testTitle';
      board.content = 'testContent';

      boardRepository.findPatchDetailById?.mockResolvedValue(board);

      await expect(boardService.getBoardPatchDataService(1, 1))
        .rejects
        .toThrow(AccessDeniedException);
    });
  });

  describe('patchBoardService', () => {
    const patchBoardDTO: PostBoardRequest = new PostBoardRequest();
    patchBoardDTO.title = 'testPatchTitle';
    patchBoardDTO.content = 'testPatchContent';

    it('데이터가 없는 경우', async () => {
      boardRepository.findWriterById?.mockResolvedValue(null);

      await expect(boardService.patchBoardService(1, patchBoardDTO, 1))
        .rejects
        .toThrow(BadRequestException);

      expect(boardRepository.patchBoard).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      boardRepository.findWriterById?.mockResolvedValue(2);

      await expect(boardService.patchBoardService(1, patchBoardDTO, 1))
        .rejects
        .toThrow(AccessDeniedException);

      expect(boardRepository.patchBoard).not.toHaveBeenCalled();
    });
  });

  describe('deleteBoardService', () => {
    it('데이터가 없는 경우', async () => {
      boardRepository.findWriterById?.mockResolvedValue(null);

      await expect(boardService.deleteBoardService(1, 1))
        .rejects
        .toThrow(BadRequestException);

      expect(boardRepository.delete).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      boardRepository.findWriterById?.mockResolvedValue(2);

      await expect(boardService.deleteBoardService(1, 1))
        .rejects
        .toThrow(AccessDeniedException);

      expect(boardRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getReplyDataService', () => {
    it('데이터가 없는 경우', async () => {
      boardRepository.findById?.mockResolvedValue(null);

      await expect(boardService.getReplyDataService(1))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('postBoardReplyService', () => {
    const replyDTO: PostReplyRequest = new PostReplyRequest();
    replyDTO.title = 'testReplyTitle';
    replyDTO.content = 'testReplyContent';
    it('상위 데이터가 없는 경우', async () => {
      boardRepository.findById?.mockResolvedValue(null);

      await expect(boardService.postBoardReplyService(replyDTO, 1, 1))
        .rejects
        .toThrow(BadRequestException);
    })
  })
})