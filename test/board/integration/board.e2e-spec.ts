import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { MemberRepository } from '#member/repositories/member.repository';
import { AuthRepository } from '#member/repositories/auth.repository';
import { BoardRepository } from '#board/repositories/board.repository';
import { DataSource } from 'typeorm';
import type { RedisClientType } from 'redis';
import { Member } from '#member/entities/member.entity';
import { TestTokenUtil } from '../../utils/testToken.util';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '#src/app.module';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import cookieParser from 'cookie-parser';
import { Auth } from '#member/entities/auth.entity';
import { Board } from '#board/entities/board.entity';
import request from 'supertest';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { PostBoardDto } from '#board/dtos/in/post-board.dto';
import { keywordLengthMessage } from '#common/constants/common-validate-message.constans';

describe('BoardController E2E Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redisClient: RedisClientType;

  let tokenProvider: JWTTokenProvider;

  let memberRepository: MemberRepository;
  let authRepository: AuthRepository;
  let boardRepository: BoardRepository;

  let configService: ConfigService;
  let tokenUtil: TestTokenUtil;

  const baseUrl = '/board';

  const firstMember: Member = new Member();
  const secondMember: Member = new Member();

  let testBoard: Board;
  const boardListCount: number = 33;
  const boardAmount: number = 20;
  const anonymousId = 'Anonymous';


  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .compile();

    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    boardRepository = moduleFixture.get<BoardRepository>(BoardRepository);

    tokenProvider = moduleFixture.get<JWTTokenProvider>(JWTTokenProvider);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    redisClient = moduleFixture.get<RedisClientType>(REDIS_CLIENT);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    tokenUtil = new TestTokenUtil(tokenProvider, configService);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
      })
    )

    await app.init();

    firstMember.userId = 'tester';
    firstMember.userPw = '1234';
    firstMember.userName = 'testerName';
    firstMember.nickName = 'testerNickname';
    firstMember.email = 'tester@tester.com';
    firstMember.profileThumbnail = 'testProfileThumbnail.png';
    firstMember.provider = 'local';

    secondMember.userId = 'tester2';
    secondMember.userPw = '1234';
    secondMember.userName = 'testerName2';
    secondMember.nickName = 'testerNickname2';
    secondMember.email = 'tester2@tester.com';
    secondMember.profileThumbnail = 'testProfileThumbnail2.png';
    secondMember.provider = 'local';

    const saveMembers: Member[] = [firstMember, secondMember];
    const memberRole: string = 'ROLE_MEMBER';
    const saveAuths: Auth[] = [
      authRepository.create({
        userId: firstMember.userId,
        auth: memberRole
      }),
        authRepository.create({
        userId: secondMember.userId,
        auth: memberRole
      })
    ];

    await memberRepository.save(saveMembers);
    await authRepository.save(saveAuths);
  });

  beforeEach(async () => {
    await boardRepository.deleteAll();

    const boardArr: Board[] = [];

    for(let i = 0; i < boardListCount - 3; i++) {
      boardArr.push(
        boardRepository.create({
          userId: firstMember.userId,
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
        userId: firstMember.userId,
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
        userId: firstMember.userId,
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
        userId: firstMember.userId,
        boardTitle: `testTitle28Reply3`,
        boardContent: `testContent28Reply3`,
        boardGroupNo: replyGroupNo,
        boardUpperNo: `${replyGroupNo},${replyNoStart - 2},${replyNoStart}`,
        boardIndent: 3,
      })
    );

    await boardRepository.save(saveBoard);
  })

  afterEach(async () => {
    if(redisClient?.isOpen)
      await redisClient.flushAll();
  })

  afterAll(async () => {
    await boardRepository.deleteAll();
    await authRepository.deleteAll();
    await memberRepository.deleteAll();

    await dataSource.destroy();

    await app.close();
  })

  describe('GET /', () => {
    it('정상 조회. 검색어 없음', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. 검색어 없음. 로그인 시', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
    });

    it('검색어가 1글자인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': 't' })
        .query({ 'searchType': 't' })
        .expect(400);

      expect(response.body.message[0]).toBe(keywordLengthMessage);
    })

    it('잘못된 검색 타입인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': 'testKeyword' })
        .query({ 'searchType': 'title' })
        .expect(400);

      expect(response.body.message[0]).toBe('searchType must be one of the following values: t, c, tc, u');
    });

    it('정상 조회. 제목 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 't' })
        .expect(200);

      const body = response.body;

      expect(body.totalElements).toBe(1);
      expect(body.empty).toBeFalsy();
      expect(body.content.length).toBe(1);
      expect(body.content[0].boardTitle).toBe('testTitle11');
    });

    it('정상 조회. 내용 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 'c' })
        .expect(200);

      const body = response.body;

      expect(body.totalElements).toBe(1);
      expect(body.empty).toBeFalsy();
      expect(body.content.length).toBe(1);
      expect(body.content[0].boardTitle).toBe('testTitle11');
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 'tc' })
        .expect(200);

      const body = response.body;

      expect(body.totalElements).toBe(1);
      expect(body.empty).toBeFalsy();
      expect(body.content.length).toBe(1);
      expect(body.content[0].boardTitle).toBe('testTitle11');
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': firstMember.userId })
        .query({ 'searchType': 'u' })
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'pageNum': 2 })
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardListCount - boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
    });

    it('데이터가 없는 경우', async () => {
      await boardRepository.deleteAll();

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(0);
      expect(body.empty).toBeTruthy();
      expect(body.totalElements).toBe(0);
    })
  });

  describe('GET /:boardNo', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${testBoard.boardNo}`)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.boardNo).toBe(testBoard.boardNo);
      expect(body.content.boardTitle).toBe(testBoard.boardTitle);
      expect(body.content.boardContent).toBe(testBoard.boardContent);
      expect(body.content.userId).toBe(testBoard.userId);
      expect(body.content.boardDate).toBeDefined();
    });

    it('게시글 번호가 문자열인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/b1`)
        .expect(400);

      expect(response.body.message).toBe('Validation failed (numeric string is expected)')
    });

    it('데이터가 없는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/0`)
        .expect(404);

      expect(response.body.message).toBe(ResponseStatusConstants.NOT_FOUND.MESSAGE);
    });
  });

  describe('POST /', () => {
    const postTitle = 'testPostTitle';
    const postContent = 'testPostContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: postTitle,
          boardContent: postContent,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.boardNo).toBeDefined();

      const saveBoardNo: number = response.body.boardNo;

      const saveBoard: Board | null = await boardRepository.findOne({ where: { boardNo: saveBoardNo } });

      expect(saveBoard).not.toBeNull();
      expect(saveBoard?.boardTitle).toBe(postTitle);
      expect(saveBoard?.boardContent).toBe(postContent);
      expect(saveBoard?.userId).toBe(firstMember.userId);
      expect(saveBoard?.boardGroupNo).toBe(saveBoardNo);
      expect(saveBoard?.boardUpperNo).toBe(`${saveBoardNo}`);
      expect(saveBoard?.boardIndent).toBe(1);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .send({
          boardTitle: postTitle,
          boardContent: postContent,
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('제목이 한글자인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: 't',
          boardContent: postContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
    });

    it('제목이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .send({
          boardContent: postContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle should not be null or undefined');
    });

    it('제목이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: '',
          boardContent: postContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
    });

    it('내용이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: postTitle,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: postTitle,
          boardContent: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent is not empty');
    });
  });

  describe('GET /patch-detail/:boardNo', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.boardTitle).toBe(testBoard.boardTitle);
      expect(body.content.boardContent).toBe(testBoard.boardContent);
      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.boardNo}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/0`)
        .set('Cookie', tokenCookies)
        .expect(404);

      expect(response.body.message).toBe(ResponseStatusConstants.NOT_FOUND.MESSAGE);
    });
  });

  describe('PATCH /:boardNo', () => {
    const patchTitle = 'testPatchTitle';
    const patchContent = 'testPatchContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: patchTitle,
          boardContent: patchContent
        })
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.boardNo).toBeDefined();

      const patchNo: number = body.boardNo;

      const patchBoard: Board | null = await boardRepository.findOne({ where : { boardNo: patchNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.boardTitle).toBe(patchTitle);
      expect(patchBoard?.boardContent).toBe(patchContent);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .send({
          boardTitle: patchTitle,
          boardContent: patchContent
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: patchTitle,
          boardContent: patchContent
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    });

    it('제목이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          boardContent: patchContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle should not be null or undefined');
    });

    it('제목이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: '',
          boardContent: patchContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
    });

    it('내용이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: patchTitle,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: patchTitle,
          boardContent: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent is not empty');
    });
  });

  describe('DELETE /:boardNo', () => {
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .expect(204);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { boardNo: testBoard.boardNo } });

      expect(deleteBoard).toBeNull();
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/0`)
        .set('Cookie', tokenCookies)
        .expect(404);

      expect(response.body.message).toBe(ResponseStatusConstants.NOT_FOUND.MESSAGE);
    })

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { boardNo: testBoard.boardNo } });

      expect(deleteBoard).not.toBeNull();
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.boardNo}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });
  });

  describe('GET /reply/:boardNo', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/reply/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.boardGroupNo).toBe(testBoard.boardGroupNo);
      expect(body.content.boardUpperNo).toBe(testBoard.boardUpperNo);
      expect(body.content.boardIndent).toBe(testBoard.boardIndent);
      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId)
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/reply/0`)
        .set('Cookie', tokenCookies)
        .expect(404);

      expect(response.body.message).toBe(ResponseStatusConstants.NOT_FOUND.MESSAGE);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/reply/${testBoard.boardNo}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });
  });

  describe('POST /reply', () => {
    const replyTitle: string = 'testReplyTitle';
    const replyContent: string = 'testReplyContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(201);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.boardNo).toBeDefined();

      const saveReplyNo: number = body.boardNo;

      const saveReply: Board | null = await boardRepository.findOne({ where: { boardNo: saveReplyNo } });

      expect(saveReply).not.toBeNull();
      expect(saveReply?.boardTitle).toBe(replyTitle);
      expect(saveReply?.boardContent).toBe(replyContent);
      expect(saveReply?.userId).toBe(firstMember.userId);
      expect(saveReply?.boardGroupNo).toBe(testBoard.boardGroupNo);
      expect(saveReply?.boardUpperNo).toBe(`${testBoard.boardUpperNo},${saveReplyNo}`);
      expect(saveReply?.boardIndent).toBe(testBoard.boardIndent + 1);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('상위 글이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo) - boardListCount,
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(404);

      expect(response.body.message).toBe(ResponseStatusConstants.NOT_FOUND.MESSAGE);
    });

    it('제목이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle should not be null or undefined');
    });

    it('제목이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: '',
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
    });

    it('내용이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: '',
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent is not empty');
    });

    it('boardGroupNo가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardGroupNo should not be null or undefined');
    });

    it('boardGroupNo가 정수가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: '1',
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardGroupNo less than 0');
    });

    it('boardGroupNo가 1보다 작은 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: 0,
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardGroupNo less than 0');
    });

    it('boardUpperNo가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardUpperNo should not be null or undefined');
    });

    it('boardUpperNo가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: '',
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardUpperNo is not empty');
    });

    it('boardUpperNo가 문자열이 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: Number(testBoard.boardUpperNo),
          boardIndent: Number(testBoard.boardIndent)
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardUpperNo must be a string');
    });

    it('boardIndent가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardIndent should not be null or undefined');
    });

    it('boardIndent가 정수가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: '1'
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardIndent less than 0');
    });

    it('boardIndent가 1보다 작은 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          boardTitle: replyTitle,
          boardContent: replyContent,
          boardGroupNo: Number(testBoard.boardGroupNo),
          boardUpperNo: testBoard.boardUpperNo,
          boardIndent: 0
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardIndent less than 0');
    });
  });
})