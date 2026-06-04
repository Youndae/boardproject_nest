import { BoardRepository } from '#board/repositories/board.repository';
import { MemberRepository } from '#member/repositories/member.repository';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { Member } from '#member/entities/member.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { MemberModule } from '#member/member.module';
import { BoardModule } from '#board/board.module';
import { Board } from '#board/entities/board.entity';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { BoardListResponse } from '#board/dtos/out/board-list.response.dto';
import { BoardDetailResponse } from '#board/dtos/out/board-detail.response.dto';
import { PostReplyRequest } from '#board/dtos/in/post-reply.request.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { getTotalPages } from '../../utils/pagination.utils';
import { PostBoardRequest } from '#board/dtos/in/post-board.request.dto';

describe('boardRepository', () => {
  let boardRepository: BoardRepository;
  let memberRepository: MemberRepository;
  let dataSource: DataSource;
  let app: INestApplication;

  let testBoard: Board;
  const boardListCount: number = 33;
  let member: Member = new Member();

  const boardAmount: number = PAGE_AMOUNT.BOARD;

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        MemberModule,
        BoardModule,
      ],
      providers: [BoardRepository, MemberRepository],
    }).compile();

    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    boardRepository = moduleFixture.get<BoardRepository>(BoardRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    app = moduleFixture.createNestApplication();
    await app.init();

    await boardRepository.deleteAll();
    await memberRepository.deleteAll();

    const saveMember: Member = new Member();

    saveMember.userId = 'tester';
    saveMember.password = '1234';
    saveMember.username = 'testerName';
    saveMember.nickname = 'testerNickname';
    saveMember.email = 'tester@tester.com';
    saveMember.profile = 'localProfileName.jpg';
    saveMember.provider = 'local';

    member = memberRepository.create(saveMember);
    member = await memberRepository.save(saveMember);
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
          indent: 0,
        })
      );
    }

    const saveBoard: Board[] = await boardRepository.save(boardArr);

    saveBoard.forEach(entity => {
      entity.groupNo = entity.id;
      entity.upperNo = `${entity.id}`;
    })

    let replyNoStart: number = saveBoard[saveBoard.length - 1].id;
    const replyGroupNo: number = replyNoStart - 1;
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

  })

  afterAll(async () => {
    await boardRepository.deleteAll();
    await memberRepository.deleteAll();
    await dataSource.destroy();

    await app.close();
  })

  describe('getBoardList', () => {
    it('정상 조회. 검색어 없음', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);
      const result: ListResponse<BoardListResponse> = await boardRepository.getBoardList(pageDTO);

      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.items.length).toBe(boardAmount);
      expect(result.items[2].indent).toBe(2);
      expect(result.items[3].indent).toBe(3);
      expect(result.items[4].indent).toBe(2);
    });

    it('정상 조회. 제목기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: ListResponse<BoardListResponse> = await boardRepository.getBoardList(pageDTO);

      expect(result.totalPages).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 내용기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'c';

      const result: ListResponse<BoardListResponse> = await boardRepository.getBoardList(pageDTO);

      expect(result.totalPages).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'tc';

      const result: ListResponse<BoardListResponse> = await boardRepository.getBoardList(pageDTO);

      expect(result.totalPages).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = member.userId;
      pageDTO.searchType = 'u';
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      const result: ListResponse<BoardListResponse> = await boardRepository.getBoardList(pageDTO);

      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.items.length).toBe(boardAmount);
      expect(result.items[2].indent).toBe(2);
      expect(result.items[3].indent).toBe(3);
      expect(result.items[4].indent).toBe(2);
    });
  });

  describe('getBoardDetail', () => {
    it('정상 조회', async () => {
      const result: BoardDetailResponse | null = await boardRepository.getBoardDetail(testBoard.id);

      expect(result).not.toBeNull();
      expect(result?.title).toBe(testBoard.title);
      expect(result?.writer).toBe(member.nickname);
      expect(result?.writerId).toBe(member.userId);
      expect(result?.content).toBe(testBoard.content);
      expect(result?.createdAt).toBeDefined();
    });

    it('데이터가 없는 경우', async () => {
      const result: BoardDetailResponse | null = await boardRepository.getBoardDetail(0);

      expect(result).toBeNull();
    })
  });

  describe('postReply', () => {
    it('정상 처리', async () => {
      const replyDTO: PostReplyRequest = new PostReplyRequest();
      replyDTO.title = 'testReplyTitle';
      replyDTO.content = 'testReplyContent';


      const result: number = await boardRepository.postReply(replyDTO, testBoard, member.id);

      expect(result).toBeDefined();

      const saveReply: Board | null = await boardRepository.findOne({ where: { id: result }});

      expect(saveReply).not.toBeNull();
      expect(saveReply?.title).toBe(replyDTO.title);
      expect(saveReply?.content).toBe(replyDTO.content);
      expect(saveReply?.groupNo).toBe(testBoard.groupNo);
      expect(saveReply?.upperNo).toBe(`${testBoard.upperNo},${result}`);
      expect(saveReply?.indent).toBe(testBoard.indent + 1);
    });
  });

  describe('patchBoard', () => {
    it('정상 처리', async () => {
      const patchRequest: PostBoardRequest = new PostBoardRequest();
      patchRequest.title = 'patchTitle';
      patchRequest.content = 'patchContent';
      const targetId: number = testBoard.id;

      await boardRepository.patchBoard(targetId, patchRequest);

      const patchBoard: Board | null = await boardRepository.findOne({ where: { id: targetId } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.id).toBe(targetId);
      expect(patchBoard?.title).toBe(patchRequest.title);
      expect(patchBoard?.content).toBe(patchRequest.content);
      expect(patchBoard?.groupNo).toBe(testBoard.groupNo);
      expect(patchBoard?.upperNo).toBe(testBoard.upperNo);
      expect(patchBoard?.indent).toBe(testBoard.indent);
      expect(patchBoard?.createdAt).toStrictEqual(testBoard.createdAt);
    })
  });

  describe('findWriterById', () => {
    it('정상 조회', async () => {
      const result: number | null = await boardRepository.findWriterById(testBoard.id);

      expect(result).not.toBeNull();
      expect(result).toBe(member.id);
    });

    it('데이터가 없는 경우', async () => {
      const result: number | null = await boardRepository.findWriterById(0);

      expect(result).toBeNull();
    })
  });

  describe('findPatchDetailById', () => {
    it('정상 조회', async () => {
      const result: Board | null = await boardRepository.findPatchDetailById(testBoard.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBeUndefined();
      expect(result?.title).toBe(testBoard.title);
      expect(result?.content).toBe(testBoard.content);
      expect(result?.userId).toBe(testBoard.userId);
      expect(result?.groupNo).toBeUndefined();
      expect(result?.upperNo).toBeUndefined();
      expect(result?.indent).toBeUndefined();
      expect(result?.createdAt).toBeUndefined();
    });

    it('데이터가 없는 경우', async () => {
      const result: Board | null = await boardRepository.findPatchDetailById(0);

      expect(result).toBeNull();
    })
  })
})