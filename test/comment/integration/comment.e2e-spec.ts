import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { RedisClientType } from 'redis';
import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { MemberRepository } from '#member/repositories/member.repository';
import { AuthRepository } from '#member/repositories/auth.repository';
import { BoardRepository } from '#board/repositories/board.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { ConfigService } from '@nestjs/config';
import { TestTokenUtil } from '../../utils/testToken.util';
import { Member } from '#member/entities/member.entity';
import { Board } from '#board/entities/board.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '#src/app.module';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import cookieParser from 'cookie-parser';
import { Auth } from '#member/entities/auth.entity';
import { Comment } from '#comment/entities/comment.entity';
import request from 'supertest';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import {
  commentContentDefinedMessage,
  commentContentNotEmptyMessage,
} from '#comment/constants/comment-validate-message.constants';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { ApiResponse } from '#common/dtos/out/api.response.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { CommentListResponse } from '#comment/dtos/out/comment-list.response.dto';
import { getTotalPages } from '../../utils/pagination.utils';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '#common/interceptor/transform.interceptor';

describe('CommentController E2E Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redisClient: RedisClientType;

  let tokenProvider: JWTTokenProvider;

  let memberRepository: MemberRepository;
  let authRepository: AuthRepository;
  let boardRepository: BoardRepository;
  let imageBoardRepository: ImageBoardRepository;
  let commentRepository: CommentRepository;

  let configService: ConfigService;
  let tokenUtil: TestTokenUtil;

  const baseUrl = '/comment';

  const firstMember: Member = new Member();
  const secondMember: Member = new Member();

  let testBoard: Board;
  let testImageBoard: ImageBoard;
  let testComment: Comment;
  const commentListCount: number = 33;
  const commentAmount: number = PAGE_AMOUNT.COMMENT;
  const boardCommentContentPrefix: string = 'boardCommentContent';
  const imageBoardCommentContentPrefix: string = 'imageBoardCommentContent';

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .compile();

    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    boardRepository = moduleFixture.get<BoardRepository>(BoardRepository);
    imageBoardRepository = moduleFixture.get<ImageBoardRepository>(ImageBoardRepository);
    commentRepository = moduleFixture.get<CommentRepository>(CommentRepository);

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

    await commentRepository.deleteAll();
    await boardRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await authRepository.deleteAll();
    await memberRepository.deleteAll();

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
    await memberRepository.save(saveMembers);
    firstMember.id = saveMembers[0].id;
    secondMember.id = saveMembers[1].id;

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

    const board: Board = boardRepository.create({
      userId: firstMember.id,
      title: 'testBoardTitle',
      content: 'testBoardContent',
      indent: 1
    });

    const saveBoard: Board = await boardRepository.save(board);
    saveBoard.groupNo = saveBoard.id;
    saveBoard.upperNo = `${saveBoard.id}`;

    await boardRepository.save(saveBoard);

    testBoard = saveBoard;

    const imageBoard: ImageBoard = imageBoardRepository.create({
      userId: firstMember.id,
      title: 'testImageBoardTitle',
      content: 'testImageBoardContent'
    });

    const saveImageBoard: ImageBoard = await imageBoardRepository.save(imageBoard);
    testImageBoard = saveImageBoard;
  });

  beforeEach(async () => {
    await commentRepository.deleteAll();

    const commentArr: Comment[] = [];

    for(let i = 0; i < commentListCount; i++) {
      commentArr.push(
        commentRepository.create({
          boardId: testBoard.id,
          imageId: null,
          userId: firstMember.id,
          content: `${boardCommentContentPrefix}${i}`,
          indent: 0
        })
      );

      commentArr.push(
        commentRepository.create({
          boardId: null,
          imageId: testImageBoard.id,
          userId: firstMember.id,
          content: `${imageBoardCommentContentPrefix}${i}`,
          indent: 1
        })
      );
    }

    const saveComment: Comment[] = await commentRepository.save(commentArr);

    saveComment.forEach(entity => {
      entity.groupNo = entity.id;
      entity.upperNo = `${entity.id}`;
    });
    testComment = saveComment[0];

    let commentReplyStartNo: number = saveComment[saveComment.length - 1].id;
    const replyEntity: Comment = saveComment.filter(entity =>
      entity.content === `${boardCommentContentPrefix}${commentListCount - 1}`
    )[0];

    saveComment.push(
      commentRepository.create({
        id: ++commentReplyStartNo,
        boardId: replyEntity.boardId,
        imageId: null,
        userId: firstMember.id,
        content: `reply${boardCommentContentPrefix}1`,
        groupNo: replyEntity.groupNo,
        upperNo: `${replyEntity.upperNo},${commentReplyStartNo}`,
        indent: 1
      })
    )

    saveComment.push(
      commentRepository.create({
        id: ++commentReplyStartNo,
        boardId: replyEntity.boardId,
        imageId: null,
        userId: firstMember.id,
        content: `reply${boardCommentContentPrefix}2`,
        groupNo: replyEntity.groupNo,
        upperNo: `${replyEntity.upperNo},${commentReplyStartNo}`,
        indent: 1
      })
    )

    saveComment.push(
      commentRepository.create({
        id: ++commentReplyStartNo,
        boardId: replyEntity.boardId,
        imageId: null,
        userId: firstMember.id,
        content: `reply${boardCommentContentPrefix}3`,
        groupNo: replyEntity.groupNo,
        upperNo: `${replyEntity.upperNo},${commentReplyStartNo - 2},${commentReplyStartNo}`,
        indent: 2
      })
    )

    await commentRepository.save(saveComment);
  });

  afterEach(async () => {
    if(redisClient?.isOpen)
      await redisClient.flushAll();
  });

  afterAll(async () => {
    await commentRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await boardRepository.deleteAll();
    await authRepository.deleteAll();
    await memberRepository.deleteAll();

    await dataSource.destroy();

    await app.close();
  });

  describe('GET /board', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .query({ 'id': `${testBoard.id}` })
        .expect(200);

      const body: ApiResponse<ListResponse<CommentListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<CommentListResponse> | null = body.content;

      const totalPageFixture: number = getTotalPages(commentListCount, commentAmount);

      expect(content?.items.length).toBe(commentAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);

      expect(content?.items[1].content).toBe(`reply${boardCommentContentPrefix}1`);
      expect(content?.items[2].content).toBe(`reply${boardCommentContentPrefix}3`);
      expect(content?.items[3].content).toBe(`reply${boardCommentContentPrefix}2`);
    });

    it('정상 조회. 로그인 시', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .set('Cookie', tokenCookies)
        .query({ 'id': `${testBoard.id}` })
        .expect(200);

      const body: ApiResponse<ListResponse<CommentListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<CommentListResponse> | null = body.content;

      const totalPageFixture: number = getTotalPages(commentListCount + 3, commentAmount);

      expect(content?.items.length).toBe(commentAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);

      expect(content?.items[1].content).toBe(`reply${boardCommentContentPrefix}1`);
      expect(content?.items[2].content).toBe(`reply${boardCommentContentPrefix}3`);
      expect(content?.items[3].content).toBe(`reply${boardCommentContentPrefix}2`);
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .query({ 'id': `${testBoard.id}` })
        .expect(200);

      const body: ApiResponse<ListResponse<CommentListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<CommentListResponse> | null = body.content;

      expect(content?.items).toStrictEqual([]);
      expect(content?.items.length).toBe(0);
      expect(content?.isEmpty).toBeTruthy();
      expect(content?.totalPages).toBe(0);
      expect(content?.currentPage).toBe(1);
    });

    it('id가 숫자로 변환할 수 없는 문자열인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .query({ 'id': 'boardNo' })
        .expect(400);

      expect(response.body.message[0]).toBe('id must be an integer number');
    })

    it('id가 존재하지 않는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .expect(400);

      expect(response.body.message[0]).toBe('id should not be null or undefined');
    });
  });

  describe('GET /image-board', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image-board`)
        .query({ 'id': `${testImageBoard.id}` })
        .expect(200);

      const body: ApiResponse<ListResponse<CommentListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<CommentListResponse> | null = body.content;
      const totalPageFixture: number = getTotalPages(commentListCount, commentAmount);


      expect(content?.items.length).toBe(commentAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. 로그인 시', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image-board`)
        .set('Cookie', tokenCookies)
        .query({ 'id': `${testImageBoard.id}` })
        .expect(200);

      const body: ApiResponse<ListResponse<CommentListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<CommentListResponse> | null = body.content;
      const totalPageFixture: number = getTotalPages(commentListCount, commentAmount);

      expect(content?.items.length).toBe(commentAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image-board`)
        .query({ 'id': `${testImageBoard.id}` })
        .expect(200);

      const body: ApiResponse<ListResponse<CommentListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<CommentListResponse> | null = body.content;

      expect(content?.items.length).toBe(0);
      expect(content?.isEmpty).toBeTruthy();
      expect(content?.totalPages).toBe(0);
      expect(content?.currentPage).toBe(1);
    });

    it('id가 숫자로 변환할 수 없는 문자열인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image-board`)
        .query({ 'id': 'imageNo' })
        .expect(400);

      expect(response.body.message[0]).toBe('id must be an integer number');
    })
  });

  describe('POST /board/:targetBoardId', () => {
    const postCommentContent = 'testPostCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          content: postCommentContent,
        })
        .expect(201);

      const body: ApiResponse<number> = response.body;
      expect(body.code).toBe(201);

      const commentList: Comment[] = await commentRepository.find({ order: { 'id': 'DESC' } });
      const saveComment: Comment = commentList[0];

      expect(saveComment.content).toBe(postCommentContent);
      expect(saveComment.userId).toBe(firstMember.id);
      expect(saveComment.boardId).toBe(testBoard.id);
      expect(saveComment.imageId).toBeNull();
      expect(saveComment.groupNo).toBe(saveComment.id);
      expect(saveComment.upperNo).toBe(`${saveComment.id}`);
      expect(saveComment.indent).toBe(0);
      expect(saveComment.createdAt).toBeDefined();
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
          .post(`${baseUrl}/board/${testBoard.id}`)
          .send({
            content: postCommentContent,
          })
          .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          content: '',
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    })
  });

  describe('POST /image-board/:targetBoardId', () => {
    const postCommentContent = 'testPostCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image-board/${testImageBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          content: postCommentContent,
        })
        .expect(201);

      const body: ApiResponse<number> = response.body;
      expect(body.code).toBe(201);

      const commentList: Comment[] = await commentRepository.find({ order: { 'id': 'DESC' } });
      const saveComment: Comment = commentList[0];

      expect(saveComment.content).toBe(postCommentContent);
      expect(saveComment.userId).toBe(firstMember.id);
      expect(saveComment.boardId).toBeNull();
      expect(saveComment.imageId).toBe(testImageBoard.id);
      expect(saveComment.groupNo).toBe(saveComment.id);
      expect(saveComment.upperNo).toBe(`${saveComment.id}`);
      expect(saveComment.indent).toBe(0);
      expect(saveComment.createdAt).toBeDefined();
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image-board/${testImageBoard.id}`)
        .send({
          content: postCommentContent,
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image-board/${testImageBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image-board/${testImageBoard.id}`)
        .set('Cookie', tokenCookies)
        .send({
          content: '',
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    })
  });

  describe('DELETE /:id', () => {
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/${testComment.id}`)
        .set('Cookie', tokenCookies)
        .expect(204);

      const deleteComment: Comment | null = await commentRepository.findOne({ where: { id: testComment.id } });

      expect(deleteComment).toBeNull();
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testComment.id}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);

      const comment: Comment | null = await commentRepository.findOne({ where: { id: testComment.id } });

      expect(comment).not.toBeNull();
    })

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testComment.id}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);

      const comment: Comment | null = await commentRepository.findOne({ where: { id: testComment.id } });

      expect(comment).not.toBeNull();
    });

    it('잘못된 댓글 번호로 요청한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/0`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    })
  });

  describe('POST /:id/reply', () => {
    const replyCommentContent = 'testReplyCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .post(`${baseUrl}/${testComment.id}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          content: replyCommentContent,
        })
        .expect(201);

      const commentList: Comment[] = await commentRepository.find({ where: { groupNo: testComment.groupNo }, order: { 'id': 'DESC' } });
      const replyComment: Comment = commentList[0];

      expect(replyComment.content).toBe(replyCommentContent);
      expect(replyComment.boardId).toBe(testComment.boardId);
      expect(replyComment.imageId).toBe(testComment.imageId);
      expect(replyComment.groupNo).toBe(testComment.groupNo);
      expect(replyComment.indent).toBe(testComment.indent + 1);
      expect(replyComment.upperNo).toBe(`${testComment.upperNo},${replyComment.id}`);
    });

    it('상위 댓글 데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/0/reply`)
        .set('Cookie', tokenCookies)
        .send({
          content: replyCommentContent,
        })
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    })

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/${testComment.id}/reply`)
        .send({
          content: replyCommentContent,
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/${testComment.id}/reply`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/${testComment.id}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          content: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    });
  });
});