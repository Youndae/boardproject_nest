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
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { BoardDetailResponseDTO } from '#board/dtos/out/board-detail-response.dto';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';
import { PostReplyDTO } from '#board/dtos/in/post-reply.dto';

describe('boardRepository', () => {
  let boardRepository: BoardRepository;
  let memberRepository: MemberRepository;
  let dataSource: DataSource;
  let app: INestApplication;

  let testBoard: Board;
  const boardListCount: number = 33;
  const member: Member = new Member();

  const boardAmount: number = 20;

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

      const result: {
        list: BoardListResponseDTO[],
        totalElements: number
      } = await boardRepository.getBoardList(pageDTO);

      expect(result.totalElements).toBe(boardListCount);
      expect(result.list.length).toBe(boardAmount);
      expect(result.list[2].boardIndent).toBe(2);
      expect(result.list[3].boardIndent).toBe(3);
      expect(result.list[4].boardIndent).toBe(2);
    });

    it('정상 조회. 제목기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: {
        list: BoardListResponseDTO[],
        totalElements: number
      } = await boardRepository.getBoardList(pageDTO);

      expect(result.totalElements).toBe(1);
      expect(result.list.length).toBe(1);
      expect(result.list[0].boardTitle).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 내용기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'c';

      const result: {
        list: BoardListResponseDTO[],
        totalElements: number
      } = await boardRepository.getBoardList(pageDTO);

      expect(result.totalElements).toBe(1);
      expect(result.list.length).toBe(1);
      expect(result.list[0].boardTitle).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'tc';

      const result: {
        list: BoardListResponseDTO[],
        totalElements: number
      } = await boardRepository.getBoardList(pageDTO);

      expect(result.totalElements).toBe(1);
      expect(result.list.length).toBe(1);
      expect(result.list[0].boardTitle).toBe(`testTitle${pageDTO.keyword}`);
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = member.userId;
      pageDTO.searchType = 'u';

      const result: {
        list: BoardListResponseDTO[],
        totalElements: number
      } = await boardRepository.getBoardList(pageDTO);

      expect(result.totalElements).toBe(boardListCount);
      expect(result.list.length).toBe(boardAmount);
      expect(result.list[2].boardIndent).toBe(2);
      expect(result.list[3].boardIndent).toBe(3);
      expect(result.list[4].boardIndent).toBe(2);
    });
  });

  describe('getBoardDetail', () => {
    it('정상 조회', async () => {
      const result: BoardDetailResponseDTO | null = await boardRepository.getBoardDetail(testBoard.boardNo);

      expect(result).not.toBeNull();
      expect(result?.boardNo).toBe(testBoard.boardNo);
      expect(result?.boardTitle).toBe(testBoard.boardTitle);
      expect(result?.boardContent).toBe(testBoard.boardContent);
      expect(result?.userId).toBe(testBoard.userId);
      expect(result?.boardDate).toBeDefined();
    });

    it('데이터가 없는 경우', async () => {
      const result: BoardDetailResponseDTO | null = await boardRepository.getBoardDetail(0);

      expect(result).toBeNull();
    })
  });

  describe('getReplyData', () => {
    it('정상 조회', async () => {
      const result: BoardReplyDataDTO | null = await boardRepository.getReplyData(testBoard.boardNo);

      expect(result).not.toBeNull();
      expect(result?.boardGroupNo).toBe(testBoard.boardGroupNo);
      expect(result?.boardUpperNo).toBe(testBoard.boardUpperNo);
      expect(result?.boardIndent).toBe(testBoard.boardIndent);
    });

    it('데이터가 없는 경우', async () => {
      const result: BoardReplyDataDTO | null = await boardRepository.getReplyData(0);

      expect(result).toBeNull();
    });
  });

  describe('postReply', () => {
    it('정상 처리', async () => {
      const replyDTO: PostReplyDTO = new PostReplyDTO();
      replyDTO.boardTitle = 'testReplyTitle';
      replyDTO.boardContent = 'testReplyContent';
      replyDTO.boardGroupNo = testBoard.boardGroupNo;
      replyDTO.boardUpperNo = testBoard.boardUpperNo;
      replyDTO.boardIndent = testBoard.boardIndent;

      const result: number = await boardRepository.postReply(replyDTO, member.userId);

      expect(result).toBeDefined();

      const saveReply: Board | null = await boardRepository.findOne({ where: { boardNo: result }});

      expect(saveReply).not.toBeNull();
      expect(saveReply?.boardTitle).toBe(replyDTO.boardTitle);
      expect(saveReply?.boardContent).toBe(replyDTO.boardContent);
      expect(saveReply?.boardGroupNo).toBe(replyDTO.boardGroupNo);
      expect(saveReply?.boardUpperNo).toBe(`${replyDTO.boardUpperNo},${result}`);
      expect(saveReply?.boardIndent).toBe(replyDTO.boardIndent + 1);
    });
  });
})