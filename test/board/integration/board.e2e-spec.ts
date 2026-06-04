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
import { keywordLengthMessage } from '#common/constants/common-validate-message.constants';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { BoardListResponse } from '#board/dtos/out/board-list.response.dto';
import { getTotalPages } from '../../utils/pagination.utils';
import { TransformInterceptor } from '#common/interceptor/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { ApiResponse } from '#common/dtos/out/api.response.dto';
import { BoardDetailResponse } from '#board/dtos/out/board-detail.response.dto';
import { BoardPatchDetailResponse } from '#board/dtos/out/board-patch-detail.response.dto';

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
  const boardAmount: number = PAGE_AMOUNT.BOARD;
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
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    await app.init();

    firstMember.userId = 'tester';
    firstMember.password = '1234';
    firstMember.username = 'testerName';
    firstMember.nickname = 'testerNickname';
    firstMember.email = 'tester@tester.com';
    firstMember.profile = 'testProfileThumbnail.png';
    firstMember.provider = 'local';

    secondMember.userId = 'tester2';
    secondMember.password = '1234';
    secondMember.username = 'testerName2';
    secondMember.nickname = 'testerNickname2';
    secondMember.email = 'tester2@tester.com';
    secondMember.profile = 'testProfileThumbnail2.png';
    secondMember.provider = 'local';

    const saveMembers: Member[] = [firstMember, secondMember];
    const savedMembers: Member[] = await memberRepository.save(saveMembers);

    firstMember.id = savedMembers[0].id;
    secondMember.id = savedMembers[1].id;

    const memberRole: string = 'ROLE_MEMBER';
    const saveAuths: Auth[] = [
      authRepository.create({
        userId: firstMember.id,
        auth: memberRole
      }),
        authRepository.create({
        userId: secondMember.id,
        auth: memberRole
      })
    ];

    await authRepository.save(saveAuths);
  });

  beforeEach(async () => {
    await boardRepository.deleteAll();

    const boardArr: Board[] = [];

    for(let i = 0; i < boardListCount - 3; i++) {
      boardArr.push(
        boardRepository.create({
          userId: firstMember.id,
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
        userId: firstMember.id,
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
        userId: firstMember.id,
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
        userId: firstMember.id,
        title: `testTitle28Reply3`,
        content: `testContent28Reply3`,
        groupNo: replyGroupNo,
        upperNo: `${replyGroupNo},${replyNoStart - 2},${replyNoStart}`,
        indent: 3,
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
    const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);
    it('정상 조회. 검색어 없음', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. 검색어 없음. 로그인 시', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
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

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.totalPages).toBe(1);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.items.length).toBe(1);
      expect(content?.items[0].title).toBe('testTitle11');
    });

    it('정상 조회. 내용 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 'c' })
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.totalPages).toBe(1);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.items.length).toBe(1);
      expect(content?.items[0].title).toBe('testTitle11');
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 'tc' })
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.totalPages).toBe(1);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.items.length).toBe(1);
      expect(content?.items[0].title).toBe('testTitle11');
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': firstMember.userId })
        .query({ 'searchType': 'u' })
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'page': 2 })
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardListCount - boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(2);
    });

    it('데이터가 없는 경우', async () => {
      await boardRepository.deleteAll();

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .expect(200);

      const body: ApiResponse<ListResponse<BoardListResponse>> = response.body
      const content: ListResponse<BoardListResponse> | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(0);
      expect(content?.isEmpty).toBeTruthy();
      expect(content?.totalPages).toBe(0);
    })
  });

  describe('GET /:id', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${testBoard.id}`)
        .expect(200);

      const body: ApiResponse<BoardDetailResponse> = response.body;
      const content: BoardDetailResponse | null = body.content;

      expect(body.code).toBe(200);
      expect(body.content).not.toBeNull();
      expect(content?.title).toBe(testBoard.title);
      expect(content?.content).toBe(testBoard.content);
      expect(content?.writer).toBe(firstMember.nickname);
      expect(content?.writerId).toBe(firstMember.userId);
      expect(content?.createdAt).toBeDefined();
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
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
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
          title: postTitle,
          content: postContent,
        })
        .expect(201);

      expect(response.body.content).not.toBeNull();
      expect(response.body.content).toBeDefined();

      const saveBoardId: number = response.body.content;

      const saveBoard: Board | null = await boardRepository.findOne({ where: { id: saveBoardId } });

      expect(saveBoard).not.toBeNull();
      expect(saveBoard?.title).toBe(postTitle);
      expect(saveBoard?.content).toBe(postContent);
      expect(saveBoard?.userId).toBe(firstMember.id);
      expect(saveBoard?.groupNo).toBe(saveBoardId);
      expect(saveBoard?.upperNo).toBe(`${saveBoardId}`);
      expect(saveBoard?.indent).toBe(0);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .send({
          title: postTitle,
          content: postContent,
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
          title: 't',
          content: postContent,
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
          content: postContent,
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
          title: '',
          content: postContent,
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
          title: postTitle,
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
          title: postTitle,
          content: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent is not empty');
    });
  });

  describe('GET /patch-detail/:id', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<BoardPatchDetailResponse> = response.body;
      const content: BoardPatchDetailResponse | null = body.content;

      expect(body.code).toBe(200);
      expect(content).not.toBeNull();
      expect(content?.title).toBe(testBoard.title);
      expect(content?.content).toBe(testBoard.content);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.id}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/0`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });
  });

  describe('PATCH /:id', () => {
    const patchTitle = 'testPatchTitle';
    const patchContent = 'testPatchContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: patchTitle,
          content: patchContent
        })
        .expect(200);

      const body: ApiResponse<number> = response.body;

      expect(body).toBeDefined();
      expect(body.content).not.toBeNull();

      const patchNo: number = body.content!;

      const patchBoard: Board | null = await boardRepository.findOne({ where : { id: patchNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchTitle);
      expect(patchBoard?.content).toBe(patchContent);
      expect(patchBoard?.userId).toBe(testBoard.userId);
      expect(patchBoard?.createdAt).toStrictEqual(testBoard.createdAt);
      expect(patchBoard?.groupNo).toBe(testBoard.groupNo);
      expect(patchBoard?.upperNo).toBe(testBoard.upperNo);
      expect(patchBoard?.indent).toBe(testBoard.indent);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .send({
          title: patchTitle,
          content: patchContent
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: patchTitle,
          content: patchContent
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    });

    it('제목이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          content: patchContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle should not be null or undefined');
    });

    it('제목이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: '',
          content: patchContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
    });

    it('내용이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: patchTitle,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: patchTitle,
          content: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent is not empty');
    });
  });

  describe('DELETE /:id', () => {
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(204);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { id: testBoard.id } });

      expect(deleteBoard).toBeNull();
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/0`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    })

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);

      const deleteBoard: Board | null = await boardRepository.findOne({ where: { id: testBoard.id } });

      expect(deleteBoard).not.toBeNull();
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.id}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });
  });

  describe('GET /reply/:id', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .get(`${baseUrl}/reply/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(200);
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/reply/0`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/reply/${testBoard.id}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });
  });

  describe('POST /reply/:targetId', () => {
    const replyTitle: string = 'testReplyTitle';
    const replyContent: string = 'testReplyContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: replyTitle,
          content: replyContent
        })
        .expect(201);

      const body: ApiResponse<number> = response.body;

      expect(body).toBeDefined();
      expect(body.content).not.toBeNull();

      const saveReplyId: number = body.content!;

      const saveReply: Board | null = await boardRepository.findOne({ where: { id: saveReplyId } });

      expect(saveReply).not.toBeNull();
      expect(saveReply?.title).toBe(replyTitle);
      expect(saveReply?.content).toBe(replyContent);
      expect(saveReply?.userId).toBe(firstMember.id);
      expect(saveReply?.groupNo).toBe(testBoard.groupNo);
      expect(saveReply?.upperNo).toBe(`${testBoard.upperNo},${saveReplyId}`);
      expect(saveReply?.indent).toBe(testBoard.indent + 1);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/${testBoard.id}`)
        .send({
          title: replyTitle,
          content: replyContent
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('상위 글이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/0`)
        .set('Cookie', tokenCookies)
        .send({
          title: replyTitle,
          content: replyContent
        })
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('제목이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          content: replyContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle should not be null or undefined');
    });

    it('제목이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: '',
          content: replyContent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
    });

    it('내용이 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: replyTitle,
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/reply/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          title: replyTitle,
          content: '',
        })
        .expect(400);

      expect(response.body.message[0]).toBe('boardContent is not empty');
    });
  });
})