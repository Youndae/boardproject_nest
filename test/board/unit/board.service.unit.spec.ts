import { BoardService } from '#board/services/board.service';
import { BoardRepository } from '#board/repositories/board.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { BoardModule } from '#board/board.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { INestApplication } from '@nestjs/common';
import { LoggerService } from '#config/logger/logger.service';
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { Board } from '#board/entities/board.entity';
import { BoardPatchDetailResponseDTO } from '#board/dtos/out/board-patch-detail-response.dto';
import { PostBoardDto } from '#board/dtos/in/post-board.dto';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';

describe('boardService unitTest', () => {
  let boardService: BoardService;
  let boardRepository: Partial<Record<keyof BoardRepository, jest.Mock>>;

  beforeEach(async () => {
    boardRepository = {
      getBoardList: jest.fn(),
      getBoardDetail: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      getReplyData: jest.fn()
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        { provide: BoardRepository, useValue: boardRepository },
        { provide: LoggerService, useValue: { info: jest.fn(), error: jest.fn() } }
      ]
    })
      .compile();

    boardService = moduleFixture.get<BoardService>(BoardService);
    jest.clearAllMocks();
  });

  describe('getListService', () => {
    it('데이터가 없는 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      boardRepository.getBoardList?.mockResolvedValue({ list: [], totalElements: 0});

      const result: { list: BoardListResponseDTO[], totalElements: number } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list.length).toBe(0);
      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it('데이터가 있는 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      const board: Board = new Board();
      board.boardNo = 1;
      board.boardTitle = 'testTitle';
      board.userId = 'tester';
      board.boardDate = new Date();
      board.boardIndent = 1;
      const boardData: BoardListResponseDTO[] = [
        new BoardListResponseDTO(board)
      ]
      boardRepository.getBoardList?.mockResolvedValue({ list: boardData, totalElements: 1});

      const result: { list: BoardListResponseDTO[], totalElements: number } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
    })
  });

  describe('getDetailService', () => {
    it('데이터가 없는 경우', async () => {
      boardRepository.getBoardDetail?.mockResolvedValue(null);

      await expect(boardService.getDetailService(3567))
        .rejects.toThrow('NOT_FOUND');
    })
  });

  describe('getBoardPatchDataService', () => {
    it('정상 조회', async () => {
      const board: Board = new Board();
      board.boardNo = 1;
      board.userId = 'tester';
      board.boardTitle = 'testTitle';
      board.boardContent = 'testContent';

      boardRepository.findOne?.mockResolvedValue(board);

      const result: BoardPatchDetailResponseDTO = await boardService.getBoardPatchDataService(1, 'tester');

      expect(result).not.toBeNull();
      expect(result.boardTitle).toBe(board.boardTitle);
      expect(result.boardContent).toBe(board.boardContent);
      expect(result.boardNo).toBe(board.boardNo);
    })

    it('데이터가 없는 경우', async () => {
      boardRepository.findOne?.mockResolvedValue(null);

      await expect(boardService.getBoardPatchDataService(1, 'tester'))
        .rejects
        .toThrow('NOT_FOUND');
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const board: Board = new Board();
      board.boardNo = 1;
      board.userId = 'writer';
      boardRepository.findOne?.mockResolvedValue(board);

      await expect(boardService.getBoardPatchDataService(1, 'tester'))
        .rejects
        .toThrow('ACCESS_DENIED');
    });
  });

  describe('patchBoardService', () => {
    const patchBoardDTO: PostBoardDto = new PostBoardDto();
    patchBoardDTO.boardTitle = 'testPatchTitle';
    patchBoardDTO.boardContent = 'testPatchContent';

    it('데이터가 없는 경우', async () => {
      boardRepository.findOne?.mockResolvedValue(null);

      await expect(boardService.patchBoardService(1, patchBoardDTO, 'tester'))
        .rejects
        .toThrow('NOT_FOUND');

      expect(boardRepository.save).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const board: Board = new Board();
      board.boardNo = 1;
      board.userId = 'writer';
      boardRepository.findOne?.mockResolvedValue(board);

      await expect(boardService.patchBoardService(1, patchBoardDTO, 'tester'))
        .rejects
        .toThrow('ACCESS_DENIED');

      expect(boardRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteBoardService', () => {
    it('데이터가 없는 경우', async () => {
      boardRepository.findOne?.mockResolvedValue(null);

      await expect(boardService.deleteBoardService(1, 'tester'))
        .rejects
        .toThrow('NOT_FOUND');

      expect(boardRepository.delete).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const board: Board = new Board();
      board.boardNo = 1;
      board.userId = 'writer';
      boardRepository.findOne?.mockResolvedValue(board);

      await expect(boardService.deleteBoardService(1, 'tester'))
        .rejects
        .toThrow('ACCESS_DENIED');

      expect(boardRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getReplyDataService', () => {
    it('정상 조회', async () => {
      const boardReplyData: BoardReplyDataDTO = new BoardReplyDataDTO();
      boardReplyData.boardGroupNo = 1;
      boardReplyData.boardUpperNo = '1';
      boardReplyData.boardIndent = 1;

      boardRepository.getReplyData?.mockResolvedValue(boardReplyData);

      const result: BoardReplyDataDTO = await boardService.getReplyDataService(1);

      expect(result).not.toBeNull();
      expect(result).toStrictEqual(boardReplyData);
    })

    it('데이터가 없는 경우', async () => {
      boardRepository.getReplyData?.mockResolvedValue(null);

      await expect(boardService.getReplyDataService(1))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });


})