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
import { BoardListResponse } from '#board/dtos/out/board-list.response.dto';
import { BoardDetailResponse } from '#board/dtos/out/board-detail.response.dto';
import { PostBoardRequest } from '#board/dtos/in/post-board.request.dto';
import { BoardPatchDetailResponse } from '#board/dtos/out/board-patch-detail.response.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { getTotalPages } from '../../utils/pagination.utils';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { PostReplyRequest } from '#board/dtos/in/post-reply.request.dto';

describe('board.service Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let boardService: BoardService;
  let memberRepository: MemberRepository;
  let boardRepository: BoardRepository;

  let testBoard: Board;
  const boardListCount: number = 30;
  const member: Member = new Member();

  const boardAmount: number = PAGE_AMOUNT.BOARD;

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
    member.password = '1234';
    member.username = 'testerName';
    member.nickname = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profile = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    const savedMember: Member = await memberRepository.save(saveMember);
    member.id = savedMember.id;
  });

  beforeEach(async () => {
    await boardRepository.deleteAll();

    const boardArr: Board[] = [];

    for(let i = 0; i < boardListCount - 3; i++) {
      boardArr.push(
        boardRepository.create({
          userId: member.id,
          title: `testTitle${i}`,
          content: `testContent${i}`,
          groupNo: i,
          upperNo: `${i}`,
          indent: 1,
        })
      );
    }

    const saveBoard: Board[] = await boardRepository.save(boardArr);

    saveBoard.forEach(entity => {
      entity.groupNo = entity.id;
      entity.upperNo = `${entity.id}`;
    })

    let replyNoStart = saveBoard[saveBoard.length - 1].id;
    const replyGroupNo = replyNoStart - 1;
    testBoard = saveBoard[saveBoard.length - 1];

    saveBoard.push(
      boardRepository.create({
        id: ++replyNoStart,
        userId: member.id,
        title: `testTitle28Reply1`,
        content: `testContent28Reply1`,
        groupNo: replyGroupNo,
        upperNo: `${replyGroupNo},${replyNoStart}`,
        indent: 2,
      })
    )

    saveBoard.push(
      boardRepository.create({
        id: ++replyNoStart,
        userId: member.id,
        title: `testTitle28Reply2`,
        content: `testContent28Reply2`,
        groupNo: replyGroupNo,
        upperNo: `${replyGroupNo},${replyNoStart}`,
        indent: 2,
      })
    )

    saveBoard.push(
      boardRepository.create({
        id: ++replyNoStart,
        userId: member.id,
        title: `testTitle28Reply3`,
        content: `testContent28Reply3`,
        groupNo: replyGroupNo,
        upperNo: `${replyGroupNo},${replyNoStart - 2},${replyNoStart}`,
        indent: 3,
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
      const result: ListResponse<BoardListResponse> = await boardService.getListService(pageDTO);
      const totalPagesFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(result).not.toBeNull();
      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(boardAmount);
      expect(result.totalPages).toBe(totalPagesFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      await boardRepository.deleteAll();

      const result: ListResponse<BoardListResponse> = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 제목 기반 검색', async () => {
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: ListResponse<BoardListResponse> = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].title).toBe(`testTitle${pageDTO.keyword}`);
      expect(result.isEmpty).toBeFalsy();
    });

    it('정상 조회. 내용 기반 검색', async () => {
      pageDTO.keyword = '12';
      pageDTO.searchType = 'c';

      const result: ListResponse<BoardListResponse> = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].title).toBe(`testTitle${pageDTO.keyword}`);
      expect(result.isEmpty).toBeFalsy();
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      pageDTO.keyword = '13';
      pageDTO.searchType = 'tc';

      const result: ListResponse<BoardListResponse> = await boardService.getListService(pageDTO);

      expect(result).not.toBeNull();
      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].title).toBe(`testTitle${pageDTO.keyword}`);
      expect(result.isEmpty).toBeFalsy();
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      pageDTO.keyword = member.userId;
      pageDTO.searchType = 'u';

      const result: ListResponse<BoardListResponse> = await boardService.getListService(pageDTO);
      const totalPagesFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(result).not.toBeNull();
      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(boardAmount);
      expect(result.totalPages).toBe(totalPagesFixture);
      expect(result.isEmpty).toBeFalsy();
    });
  })

  describe('getDetailService', () => {
    it('정상 조회.', async () => {
      const result: BoardDetailResponse = await boardService.getDetailService(testBoard.id);

      expect(result).not.toBeNull();
      expect(result.title).toBe(testBoard.title);
      expect(result.writer).toBe(member.nickname);
      expect(result.writerId).toBe(member.userId);
      expect(result.content).toBe(testBoard.content);
      expect(result.createdAt).toBeDefined();
    });

    it('데이터가 없는 경우', async () => {
      await expect(boardService.getDetailService(0))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('postBoardService', () => {
    it('정상 처리', async () => {
      const postDTO: PostBoardRequest = new PostBoardRequest();
      postDTO.title = 'testPostBoardTitle';
      postDTO.content = 'testPostBoardContent';
      const result: number = await boardService.postBoardService(postDTO, member.id);

      const postBoard: Board | null = await boardRepository.findOne({ where: { id: result } });

      expect(postBoard).not.toBeNull();
      expect(postBoard?.title).toBe(postDTO.title);
      expect(postBoard?.content).toBe(postDTO.content);
      expect(postBoard?.userId).toBe(member.id);
      expect(postBoard?.groupNo).toBe(result);
      expect(postBoard?.upperNo).toBe(`${result}`);
      expect(postBoard?.indent).toBe(0);
    });
  });

  describe('getBoardPatchDataService', () => {
    it('정상 조회', async () => {
      const result: BoardPatchDetailResponse = await boardService.getBoardPatchDataService(testBoard.id, member.id);

      expect(result).not.toBeNull();
      expect(result.title).toBe(testBoard.title);
      expect(result.content).toBe(testBoard.content);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(boardService.getBoardPatchDataService(testBoard.id, member.id + 1))
        .rejects
        .toThrow(AccessDeniedException);
    });

    it('데이터가 없는 경우', async () => {
      await expect(boardService.getBoardPatchDataService(0, member.id))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('patchBoardService', () => {
    const patchDTO: PostBoardRequest = new PostBoardRequest();
    patchDTO.title = 'testPatchTitle';
    patchDTO.content = 'testPatchContent';
    it('정상 처리', async () => {
      const result: number = await boardService.patchBoardService(testBoard.id, patchDTO, member.id);

      expect(result).not.toBeNull();
      expect(result).toBe(testBoard.id);

      const patchBoard: Board | null = await boardRepository.findOne({ where: { id: testBoard.id } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(boardService.patchBoardService(testBoard.id, patchDTO, member.id + 1))
        .rejects
        .toThrow(AccessDeniedException);
    })

    it('수정할 데이터가 없는 경우', async () => {
      await expect(boardService.patchBoardService(0, patchDTO, member.id))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('deleteBoardService', () => {
    it('정상 처리', async () => {
      await boardService.deleteBoardService(testBoard.id, member.id);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { id: testBoard.id } });

      expect(deleteBoard).toBeNull();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(boardService.deleteBoardService(testBoard.id, member.id + 1))
        .rejects
        .toThrow(AccessDeniedException);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { id: testBoard.id } });

      expect(deleteBoard).not.toBeNull();
    });

    it('삭제할 데이터가 없는 경우', async () => {
      await expect(boardService.deleteBoardService(0, member.id))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getReplyDataService', () => {
    it('정상 조회', async () => {
      await boardService.getReplyDataService(testBoard.id);
    });

    it('데이터가 없는 경우', async () => {
      await expect(boardService.getReplyDataService(0))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('postBoardReplyService', () => {
    it('정상 처리', async () => {
      const replyDTO: PostReplyRequest = new PostReplyRequest();
      replyDTO.title = 'testPostReplyTitle';
      replyDTO.content = 'testPostReplyContent';

      const result: number = await boardService.postBoardReplyService(replyDTO, testBoard.id, member.id);

      const replyBoard: Board | null = await boardRepository.findOne({ where: { id: result } });

      expect(replyBoard).not.toBeNull();
      expect(replyBoard?.title).toBe(replyDTO.title);
      expect(replyBoard?.content).toBe(replyDTO.content);
      expect(replyBoard?.createdAt).toBeDefined();
      expect(replyBoard?.userId).toBe(member.id);
      expect(replyBoard?.groupNo).toBe(testBoard.groupNo);
      expect(replyBoard?.indent).toBe(testBoard.indent + 1);
      expect(replyBoard?.upperNo).toBe(`${testBoard.upperNo},${result}`);
    });

    it('상위 게시글 번호가 잘못된 경우', async () => {
      const replyDTO: PostReplyRequest = new PostReplyRequest();
      replyDTO.title = 'testPostReplyTitle';
      replyDTO.content = 'testPostReplyContent';

      await expect(boardService.postBoardReplyService(replyDTO, 0, member.id))
        .rejects
        .toThrow(BadRequestException);
    })
  })
})