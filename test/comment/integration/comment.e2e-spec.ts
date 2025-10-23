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
import { CommentPostRequestDTO } from '#comment/dtos/in/comment-post-request.dto';
import {
  commentContentDefinedMessage,
  commentContentNotEmptyMessage,
  commentGroupNoDefinedMessage,
  commentGroupNoMinMessage,
  commentIndentDefinedMessage,
  commentIndentMinMessage, commentUpperNoDefinedMessage, commentUpperNoNotEmptyMessage,
} from '#comment/constants/comment-validate-message.constants';

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
  const commentAmount: number = 20;
  const anonymousId = 'Anonymous';
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

    await app.init();

    await commentRepository.deleteAll();
    await boardRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await authRepository.deleteAll();
    await memberRepository.deleteAll();

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

    const board: Board = boardRepository.create({
      userId: firstMember.userId,
      boardTitle: 'testBoardTitle',
      boardContent: 'testBoardContent',
      boardIndent: 1
    });

    const saveBoard: Board = await boardRepository.save(board);
    saveBoard.boardGroupNo = saveBoard.boardNo;
    saveBoard.boardUpperNo = `${saveBoard.boardNo}`;

    await boardRepository.save(saveBoard);

    testBoard = saveBoard;

    const imageBoard: ImageBoard = imageBoardRepository.create({
      userId: firstMember.userId,
      imageTitle: 'testImageBoardTitle',
      imageContent: 'testImageBoardContent'
    });

    const saveImageBoard: ImageBoard = await imageBoardRepository.save(imageBoard);
    testImageBoard = saveImageBoard;
  });

  beforeEach(async () => {
    await commentRepository.deleteAll();

    const commentArr: Comment[] = [];

    for(let i = 0; i < commentListCount - 3; i++) {
      commentArr.push(
        commentRepository.create({
          boardNo: testBoard.boardNo,
          imageNo: null,
          userId: firstMember.userId,
          commentContent: `${boardCommentContentPrefix}${i}`,
          commentIndent: 1
        })
      );

      commentArr.push(
        commentRepository.create({
          boardNo: null,
          imageNo: testImageBoard.imageNo,
          userId: firstMember.userId,
          commentContent: `${imageBoardCommentContentPrefix}${i}`,
          commentIndent: 1
        })
      );
    }

    const saveComment: Comment[] = await commentRepository.save(commentArr);

    saveComment.forEach(entity => {
      entity.commentGroupNo = entity.commentNo;
      entity.commentUpperNo = `${entity.commentNo}`;
    });
    testComment = saveComment[0];

    let commentReplyStartNo: number = saveComment[saveComment.length - 1].commentNo;
    const replyEntity: Comment = saveComment.filter(entity =>
      entity.commentContent === `${boardCommentContentPrefix}${commentListCount - 4}`
    )[0];

    saveComment.push(
      commentRepository.create({
        commentNo: ++commentReplyStartNo,
        boardNo: replyEntity.boardNo,
        imageNo: null,
        userId: firstMember.userId,
        commentContent: `reply${boardCommentContentPrefix}1`,
        commentGroupNo: replyEntity.commentGroupNo,
        commentUpperNo: `${replyEntity.commentUpperNo},${commentReplyStartNo}`,
        commentIndent: 2
      })
    )

    saveComment.push(
      commentRepository.create({
        commentNo: ++commentReplyStartNo,
        boardNo: replyEntity.boardNo,
        imageNo: null,
        userId: firstMember.userId,
        commentContent: `reply${boardCommentContentPrefix}2`,
        commentGroupNo: replyEntity.commentGroupNo,
        commentUpperNo: `${replyEntity.commentUpperNo},${commentReplyStartNo}`,
        commentIndent: 2
      })
    )

    saveComment.push(
      commentRepository.create({
        commentNo: ++commentReplyStartNo,
        boardNo: replyEntity.boardNo,
        imageNo: null,
        userId: firstMember.userId,
        commentContent: `reply${boardCommentContentPrefix}3`,
        commentGroupNo: replyEntity.commentGroupNo,
        commentUpperNo: `${replyEntity.commentUpperNo},${commentReplyStartNo - 2},${commentReplyStartNo}`,
        commentIndent: 3
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
        .query({ 'boardNo': `${testBoard.boardNo}` })
        .expect(200);

      const body = response.body;

      expect(body.content).not.toStrictEqual([]);
      expect(body.content.length).toBe(commentAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(commentListCount);

      expect(body.content[1].commentContent).toBe(`reply${boardCommentContentPrefix}1`);
      expect(body.content[2].commentContent).toBe(`reply${boardCommentContentPrefix}3`);
      expect(body.content[3].commentContent).toBe(`reply${boardCommentContentPrefix}2`);

      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. 로그인 시', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .set('Cookie', tokenCookies)
        .query({ 'boardNo': `${testBoard.boardNo}` })
        .expect(200);

      const body = response.body;

      expect(body.content).not.toStrictEqual([]);
      expect(body.content.length).toBe(commentAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(commentListCount);

      expect(body.content[1].commentContent).toBe(`reply${boardCommentContentPrefix}1`);
      expect(body.content[2].commentContent).toBe(`reply${boardCommentContentPrefix}3`);
      expect(body.content[3].commentContent).toBe(`reply${boardCommentContentPrefix}2`);

      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .query({ 'boardNo': `${testBoard.boardNo}` })
        .expect(200);

      const body = response.body;

      expect(body.content).toStrictEqual([]);
      expect(body.content.length).toBe(0);
      expect(body.empty).toBeTruthy();
      expect(body.totalElements).toBe(0);
    });

    it('boardNo가 숫자로 변환할 수 없는 문자열인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .query({ 'boardNo': 'boardNo' })
        .expect(400);

      expect(response.body.message[0]).toBe('boardNo must be an integer number');
    })

    it('boardNo, imageNo가 모두 존재하는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .query({ 'boardNo': `${testBoard.boardNo}`})
        .query({ 'imageNo': `${testImageBoard.imageNo}`})
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('boardNo, imageNo가 모두 존재하지 않는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/board`)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });
  });

  describe('GET /image', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image`)
        .query({ 'imageNo': `${testImageBoard.imageNo}` })
        .expect(200);

      const body = response.body;

      expect(body.content).not.toStrictEqual([]);
      expect(body.content.length).toBe(commentAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(commentListCount - 3);

      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. 로그인 시', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image`)
        .set('Cookie', tokenCookies)
        .query({ 'imageNo': `${testImageBoard.imageNo}` })
        .expect(200);

      const body = response.body;

      expect(body.content).not.toStrictEqual([]);
      expect(body.content.length).toBe(commentAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(commentListCount - 3);

      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image`)
        .query({ 'imageNo': `${testImageBoard.imageNo}` })
        .expect(200);

      const body = response.body;

      expect(body.content).toStrictEqual([]);
      expect(body.content.length).toBe(0);
      expect(body.empty).toBeTruthy();
      expect(body.totalElements).toBe(0);
    });

    it('imageNo가 숫자로 변환할 수 없는 문자열인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/image`)
        .query({ 'imageNo': 'imageNo' })
        .expect(400);

      expect(response.body.message[0]).toBe('imageNo must be an integer number');
    })
  });

  describe('POST /board/:boardNo', () => {
    const postCommentContent = 'testPostCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: postCommentContent,
        })
        .expect(201);

      const commentList: Comment[] = await commentRepository.find({ where: { boardNo: testBoard.boardNo }, order: { 'commentNo': 'DESC' } });
      const saveComment: Comment = commentList[0];

      expect(saveComment.commentContent).toBe(postCommentContent);
      expect(saveComment.userId).toBe(firstMember.userId);
      expect(saveComment.boardNo).toBe(testBoard.boardNo);
      expect(saveComment.imageNo).toBeNull();
      expect(saveComment.commentGroupNo).toBe(saveComment.commentNo);
      expect(saveComment.commentUpperNo).toBe(`${saveComment.commentNo}`);
      expect(saveComment.commentIndent).toBe(1);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
          .post(`${baseUrl}/board/${testBoard.boardNo}`)
          .send({
            commentContent: postCommentContent,
          })
          .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: '',
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    })
  });

  describe('POST /image/:imageNo', () => {
    const postCommentContent = 'testPostCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: postCommentContent,
        })
        .expect(201);

      const commentList: Comment[] = await commentRepository.find({ where: { imageNo: testImageBoard.imageNo }, order: { 'commentNo': 'DESC' } });
      const saveComment: Comment = commentList[0];

      expect(saveComment.commentContent).toBe(postCommentContent);
      expect(saveComment.userId).toBe(firstMember.userId);
      expect(saveComment.boardNo).toBeNull();
      expect(saveComment.imageNo).toBe(testImageBoard.imageNo);
      expect(saveComment.commentGroupNo).toBe(saveComment.commentNo);
      expect(saveComment.commentUpperNo).toBe(`${saveComment.commentNo}`);
      expect(saveComment.commentIndent).toBe(1);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}`)
        .send({
          commentContent: postCommentContent,
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: '',
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    })
  });

  describe('DELETE /:commentNo', () => {
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/${testComment.commentNo}`)
        .set('Cookie', tokenCookies)
        .expect(204);

      const deleteComment: Comment | null = await commentRepository.findOne({ where: { commentNo: testComment.commentNo } });

      expect(deleteComment).toBeNull();
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testComment.commentNo}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);

      const comment: Comment | null = await commentRepository.findOne({ where: { commentNo: testComment.commentNo } });

      expect(comment).not.toBeNull();
    })

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testComment.commentNo}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);

      const comment: Comment | null = await commentRepository.findOne({ where: { commentNo: testComment.commentNo } });

      expect(comment).not.toBeNull();
    });

    it('잘못된 댓글 번호로 요청한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/0`)
        .set('Cookie', tokenCookies)
        .expect(404);

      expect(response.body.message).toBe(ResponseStatusConstants.NOT_FOUND.MESSAGE);
    })
  });

  describe('POST /board/:boardNo/reply', () => {
    const replyCommentContent = 'testReplyCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(201);

      const commentList: Comment[] = await commentRepository.find({ where: { boardNo: testBoard.boardNo }, order: { 'commentNo': 'DESC' } });
      const replyComment: Comment = commentList[0];

      expect(replyComment.commentContent).toBe(replyCommentContent);
      expect(replyComment.boardNo).toBe(testBoard.boardNo);
      expect(replyComment.imageNo).toBeNull();
      expect(replyComment.commentGroupNo).toBe(testComment.commentGroupNo);
      expect(replyComment.commentIndent).toBe(testComment.commentIndent + 1);
      expect(replyComment.commentUpperNo).toBe(`${testComment.commentUpperNo},${replyComment.commentNo}`);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: '',
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    });

    it('GroupNo 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentGroupNoDefinedMessage);
    });

    it('GroupNo 필드 값이 1보다 작은 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: '0',
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentGroupNoMinMessage);
    });

    it('Indent 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentIndentDefinedMessage);
    });

    it('Indent 필드 값이 1보다 작은 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: '0',
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentIndentMinMessage);
    });

    it('UpperNo 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentUpperNoDefinedMessage);
    });

    it('UpperNo 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/board/${testBoard.boardNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentUpperNoNotEmptyMessage);
    })
  });

  describe('POST /image/:imageNo/reply', () => {
    const replyCommentContent = 'testReplyCommentContent';
    it('정상 처리', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(201);

      const commentList: Comment[] = await commentRepository.find({ where: { imageNo: testImageBoard.imageNo }, order: { 'commentNo': 'DESC' } });
      const replyComment: Comment = commentList[0];

      expect(replyComment.commentContent).toBe(replyCommentContent);
      expect(replyComment.boardNo).toBeNull();
      expect(replyComment.imageNo).toBe(testImageBoard.imageNo);
      expect(replyComment.commentGroupNo).toBe(testComment.commentGroupNo);
      expect(replyComment.commentIndent).toBe(testComment.commentIndent + 1);
      expect(replyComment.commentUpperNo).toBe(`${testComment.commentUpperNo},${replyComment.commentNo}`);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('내용 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentDefinedMessage);
    });

    it('내용 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: '',
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentContentNotEmptyMessage);
    });

    it('GroupNo 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentGroupNoDefinedMessage);
    });

    it('GroupNo 필드 값이 1보다 작은 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: '0',
          commentIndent: testComment.commentIndent,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentGroupNoMinMessage);
    });

    it('Indent 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentIndentDefinedMessage);
    });

    it('Indent 필드 값이 1보다 작은 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: '0',
          commentUpperNo: testComment.commentUpperNo
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentIndentMinMessage);
    });

    it('UpperNo 필드가 누락된 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentUpperNoDefinedMessage);
    });

    it('UpperNo 필드가 blank인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/image/${testImageBoard.imageNo}/reply`)
        .set('Cookie', tokenCookies)
        .send({
          commentContent: replyCommentContent,
          commentGroupNo: testComment.commentGroupNo,
          commentIndent: testComment.commentIndent,
          commentUpperNo: ''
        })
        .expect(400);

      expect(response.body.message[0]).toBe(commentUpperNoNotEmptyMessage);
    })
  });
});