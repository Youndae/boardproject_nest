import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BoardService } from '#board/services/board.service';
import { MemberRepository } from '#member/repositories/member.repository';
import { BoardRepository } from '#board/repositories/board.repository';
import { Member } from '#member/entities/member.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { BoardModule } from '#board/board.module';
import { MemberModule } from '#member/member.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { Board } from '#board/entities/board.entity';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { BoardDetailResponseDTO } from '#board/dtos/out/board-detail-response.dto';
import { PostBoardDto } from '#board/dtos/in/post-board.dto';
import { BoardPatchDetailResponseDTO } from '#board/dtos/out/board-patch-detail-response.dto';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';
import { PostReplyDTO } from '#board/dtos/in/post-reply.dto';

describe('board.service Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let boardService: BoardService;
  let memberRepository: MemberRepository;
  let boardRepository: BoardRepository;

  let testBoard: Board;
  const boardListCount: number = 33;
  const member: Member = new Member();

  const boardAmount: number = 20;

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        BoardModule,
        MemberModule,
        TestDatabaseModule
      ],
      providers: [
        BoardService,
        BoardRepository,
        MemberRepository
      ]
    })
      .compile();

    boardService = moduleFixture.get<BoardService>(BoardService);
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    boardRepository = moduleFixture.get<BoardRepository>(BoardRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    app = moduleFixture.createNestApplication();

    await app.init();

    await boardRepository.deleteAll();
    await memberRepository.deleteAll();

    member.userId = 'tester';
    member.userPw = '1234';
    member.userName = 'testerName';
    member.nickName = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profileThumbnail = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    await memberRepository.save(saveMember);
  });

  beforeEach(async () => {
    await boardRepository.deleteAll();

    const boardArr: Board[] = [];

    for(let i = 0; i < boardListCount - 3; i++) {
      boardArr.push(
        boardRepository.create({
          userId: member.userId,
          boardTitle: `testTitle${i}`,
          boardContent: `testContent${i}`,
          boardGroupNo: i,
          boardUpperNo: `${i}`,
          boardIndent: 1,
        })
      );
    }

    const saveBoard: Board[] = await boardRepository.save(boardArr);

    saveBoard.forEach(entity => {
      entity.boardGroupNo = entity.boardNo;
      entity.boardUpperNo = `${entity.boardNo}`;
    })

    let replyNoStart = saveBoard[saveBoard.length - 1].boardNo;
    const replyGroupNo = replyNoStart - 1;
    testBoard = saveBoard[saveBoard.length - 1];

    saveBoard.push(
      boardRepository.create({
        boardNo: ++replyNoStart,
        userId: member.userId,
        boardTitle: `testTitle28Reply1`,
        boardContent: `testContent28Reply1`,
        boardGroupNo: replyGroupNo,
        boardUpperNo: `${replyGroupNo},${replyNoStart}`,
        boardIndent: 2,
      })
    )

    saveBoard.push(
      boardRepository.create({
        boardNo: ++replyNoStart,
        userId: member.userId,
        boardTitle: `testTitle28Reply2`,
        boardContent: `testContent28Reply2`,
        boardGroupNo: replyGroupNo,
        boardUpperNo: `${replyGroupNo},${replyNoStart}`,
        boardIndent: 2,
      })
    )

    saveBoard.push(
      boardRepository.create({
        boardNo: ++replyNoStart,
        userId: member.userId,
        boardTitle: `testTitle28Reply3`,
        boardContent: `testContent28Reply3`,
        boardGroupNo: replyGroupNo,
        boardUpperNo: `${replyGroupNo},${replyNoStart - 2},${replyNoStart}`,
        boardIndent: 3,
      })
    );

    await boardRepository.save(saveBoard);
  });

  afterAll(async () => {
    await boardRepository.deleteAll();
    await dataSource.destroy();

    await app.close();
  })

  describe('getListService', () => {
    const pageDTO: PaginationDTO = new PaginationDTO();
    it('정상 조회. 검색어 없음.', async () => {
      const result: {
        list: BoardListResponseDTO[],
        empty: boolean,
        totalElements: number
      } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(boardAmount);
      expect(result.empty).toBeFalsy();
      expect(result.totalElements).toBe(boardListCount);
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      await boardRepository.deleteAll();

      const result: {
        list: BoardListResponseDTO[],
        empty: boolean,
        totalElements: number
      } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list).toStrictEqual([]);
      expect(result.list.length).toBe(0);
      expect(result.empty).toBeTruthy();
      expect(result.totalElements).toBe(0);
    });

    it('정상 조회. 제목 기반 검색', async () => {
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: {
        list: BoardListResponseDTO[],
        empty: boolean,
        totalElements: number
      } = await boardService.getListService(pageDTO);

      console.log('제목 기반 검색 list : ', result.list);

      expect(result).not.toBeNull();
      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(1);
      expect(result.empty).toBeFalsy();
      expect(result.totalElements).toBe(1);
      expect(result.list[0].boardTitle).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 내용 기반 검색', async () => {
      pageDTO.keyword = '12';
      pageDTO.searchType = 'c';

      const result: {
        list: BoardListResponseDTO[],
        empty: boolean,
        totalElements: number
      } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(1);
      expect(result.empty).toBeFalsy();
      expect(result.totalElements).toBe(1);
      expect(result.list[0].boardTitle).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      pageDTO.keyword = '13';
      pageDTO.searchType = 'tc';

      const result: {
        list: BoardListResponseDTO[],
        empty: boolean,
        totalElements: number
      } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(1);
      expect(result.empty).toBeFalsy();
      expect(result.totalElements).toBe(1);
      expect(result.list[0].boardTitle).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      pageDTO.keyword = member.userId;
      pageDTO.searchType = 'u';

      const result: {
        list: BoardListResponseDTO[],
        empty: boolean,
        totalElements: number
      } = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(boardAmount);
      expect(result.empty).toBeFalsy();
      expect(result.totalElements).toBe(boardListCount);
    });
  })

  describe('getDetailService', () => {
    it('정상 조회.', async () => {
      const result: BoardDetailResponseDTO = await boardService.getDetailService(testBoard.boardNo);

      expect(result).not.toBeNull();
      expect(result.boardNo).toBe(testBoard.boardNo);
      expect(result.boardTitle).toBe(testBoard.boardTitle);
      expect(result.boardContent).toBe(testBoard.boardContent);
      expect(result.userId).toBe(testBoard.userId);
      expect(result.boardDate).toBeDefined();
    });

    it('데이터가 없는 경우', async () => {
      await expect(boardService.getDetailService(0))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });

  describe('postBoardService', () => {
    it('정상 처리', async () => {
      const postDTO: PostBoardDto = new PostBoardDto();
      postDTO.boardTitle = 'testPostBoardTitle';
      postDTO.boardContent = 'testPostBoardContent';
      const result: { boardNo: number } = await boardService.postBoardService(postDTO, member.userId);

      const postBoard: Board | null = await boardRepository.findOne({ where: { boardNo: result.boardNo } });

      expect(postBoard).not.toBeNull();
      expect(postBoard?.boardTitle).toBe(postDTO.boardTitle);
      expect(postBoard?.boardContent).toBe(postDTO.boardContent);
      expect(postBoard?.userId).toBe(member.userId);
      expect(postBoard?.boardGroupNo).toBe(result.boardNo);
      expect(postBoard?.boardUpperNo).toBe(`${result.boardNo}`);
      expect(postBoard?.boardIndent).toBe(1);
    });
  });

  describe('getBoardPatchDataService', () => {
    it('정상 조회', async () => {
      const result: BoardPatchDetailResponseDTO = await boardService.getBoardPatchDataService(testBoard.boardNo, member.userId);

      expect(result).not.toBeNull();
      expect(result.boardTitle).toBe(testBoard.boardTitle);
      expect(result.boardContent).toBe(testBoard.boardContent);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(boardService.getBoardPatchDataService(testBoard.boardNo, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');
    });

    it('데이터가 없는 경우', async () => {
      await expect(boardService.getBoardPatchDataService(0, member.userId))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });

  describe('patchBoardService', () => {
    const patchDTO: PostBoardDto = new PostBoardDto();
    patchDTO.boardTitle = 'testPatchTitle';
    patchDTO.boardContent = 'testPatchContent';
    it('정상 처리', async () => {
      const result: { boardNo: number } = await boardService.patchBoardService(testBoard.boardNo, patchDTO, member.userId);

      expect(result).not.toBeNull();
      expect(result.boardNo).toBe(testBoard.boardNo);

      const patchBoard: Board | null = await boardRepository.findOne({ where: { boardNo: testBoard.boardNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.boardTitle).toBe(patchDTO.boardTitle);
      expect(patchBoard?.boardContent).toBe(patchDTO.boardContent);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(boardService.patchBoardService(testBoard.boardNo, patchDTO, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');
    })

    it('수정할 데이터가 없는 경우', async () => {
      await expect(boardService.patchBoardService(0, patchDTO, member.userId))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });

  describe('deleteBoardService', () => {
    it('정상 처리', async () => {
      await boardService.deleteBoardService(testBoard.boardNo, member.userId);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { boardNo: testBoard.boardNo } });

      expect(deleteBoard).toBeNull();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(boardService.deleteBoardService(testBoard.boardNo, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { boardNo: testBoard.boardNo } });

      expect(deleteBoard).not.toBeNull();
    });

    it('삭제할 데이터가 없는 경우', async () => {
      await expect(boardService.deleteBoardService(0, member.userId))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });

  describe('getReplyDataService', () => {
    it('정상 조회', async () => {
      const result: BoardReplyDataDTO = await boardService.getReplyDataService(testBoard.boardNo);

      expect(result).not.toBeNull();
      expect(result.boardGroupNo).toBe(testBoard.boardGroupNo);
      expect(result.boardUpperNo).toBe(testBoard.boardUpperNo);
      expect(result.boardIndent).toBe(testBoard.boardIndent);
    });

    it('데이터가 없는 경우', async () => {
      await expect(boardService.getReplyDataService(0))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });

  describe('postBoardReplyService', () => {
    it('정상 처리', async () => {
      const replyDTO: PostReplyDTO = new PostReplyDTO();
      replyDTO.boardTitle = 'testPostReplyTitle';
      replyDTO.boardContent = 'testPostReplyContent';
      replyDTO.boardGroupNo = testBoard.boardGroupNo;
      replyDTO.boardUpperNo = testBoard.boardUpperNo;
      replyDTO.boardIndent = testBoard.boardIndent;

      const result: { boardNo: number } = await boardService.postBoardReplyService(replyDTO, member.userId);

      expect(result).not.toBeNull();

      const replyBoard: Board | null = await boardRepository.findOne({ where: { boardNo: result.boardNo } });

      expect(replyBoard).not.toBeNull();
      expect(replyBoard?.boardTitle).toBe(replyDTO.boardTitle);
      expect(replyBoard?.boardContent).toBe(replyDTO.boardContent);
      expect(replyBoard?.boardDate).toBeDefined();
      expect(replyBoard?.userId).toBe(member.userId);
      expect(replyBoard?.boardGroupNo).toBe(replyDTO.boardGroupNo);
      expect(replyBoard?.boardIndent).toBe(replyDTO.boardIndent + 1);
      expect(replyBoard?.boardUpperNo).toBe(`${replyDTO.boardUpperNo},${result.boardNo}`);
    });
  })
})