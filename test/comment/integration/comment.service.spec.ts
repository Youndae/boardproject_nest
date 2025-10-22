import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommentService } from '#comment/services/comment.service';
import { MemberRepository } from '#member/repositories/member.repository';
import { BoardRepository } from '#board/repositories/board.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { Board } from '#board/entities/board.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { Member } from '#member/entities/member.entity';
import { Comment } from '#comment/entities/comment.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberModule } from '#member/member.module';
import { BoardModule } from '#board/board.module';
import { ImageBoardModule } from '#imageBoard/image-board.module';
import { CommentModule } from '#comment/comment.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { CommentListRequestDTO } from '#comment/dtos/in/comment-list-request.dto';
import { CommentListResponseDTO } from '#comment/dtos/out/comment-list-response.dto';
import { CommentPostRequestDTO } from '#comment/dtos/in/comment-post-request.dto';
import { CommentPostReplyRequestDTO } from '#comment/dtos/in/comment-post-reply-request.dto';

describe('comment.service Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let commentService: CommentService;
  let memberRepository: MemberRepository;
  let boardRepository: BoardRepository;
  let imageBoardRepository: ImageBoardRepository;
  let commentRepository: CommentRepository;

  let testBoard: Board;
  let testImageBoard: ImageBoard;
  let member: Member = new Member();
  let testComment: Comment;

  const commentAmount: number = 20;

  const commentListCount: number = 30;
  const boardCommentContentPrefix: string = 'boardCommentContent';
  const imageBoardCommentContentPrefix: string = 'imageBoardCommentContent';

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MemberModule,
        BoardModule,
        ImageBoardModule,
        CommentModule,
        TestDatabaseModule
      ],
      providers: [
        CommentService,
        MemberRepository,
        BoardRepository,
        ImageBoardRepository,
        CommentRepository
      ]
    })
      .compile();

    commentService = moduleFixture.get<CommentService>(CommentService);
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    boardRepository = moduleFixture.get<BoardRepository>(BoardRepository);
    imageBoardRepository = moduleFixture.get<ImageBoardRepository>(ImageBoardRepository);
    commentRepository = moduleFixture.get<CommentRepository>(CommentRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    app = moduleFixture.createNestApplication();

    await app.init();

    await commentRepository.deleteAll();
    await boardRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    const userId: string = 'tester';

    member.userId = userId;
    member.userPw = '1234';
    member.userName = 'testerName';
    member.nickName = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profileThumbnail = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    await memberRepository.save(saveMember);

    const board: Board = boardRepository.create({
      userId: userId,
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
      userId: userId,
      imageTitle: 'testImageBoardTitle',
      imageContent: 'testImageBoardContent'
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
          boardNo: testBoard.boardNo,
          imageNo: null,
          userId: member.userId,
          commentContent: `${boardCommentContentPrefix}${i}`,
          commentIndent: 1
        })
      );

      commentArr.push(
        commentRepository.create({
          boardNo: null,
          imageNo: testImageBoard.imageNo,
          userId: member.userId,
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
      entity.commentContent === `${boardCommentContentPrefix}${commentListCount - 1}`
    )[0];

    saveComment.push(
      commentRepository.create({
        commentNo: ++commentReplyStartNo,
        boardNo: replyEntity.boardNo,
        imageNo: null,
        userId: member.userId,
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
        userId: member.userId,
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
        userId: member.userId,
        commentContent: `reply${boardCommentContentPrefix}3`,
        commentGroupNo: replyEntity.commentGroupNo,
        commentUpperNo: `${replyEntity.commentUpperNo},${commentReplyStartNo - 2},${commentReplyStartNo}`,
        commentIndent: 3
      })
    )

    await commentRepository.save(saveComment);
  });

  afterAll(async () => {
    await commentRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await boardRepository.deleteAll();
    await memberRepository.deleteAll();

    await app.close();
  })

  describe('getCommentListService', () => {
    it('정상 조회. 일반 게시글 기준', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.boardNo = testBoard.boardNo;

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentService.getCommentListService(commentListDTO);

      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(commentAmount);
      expect(result.totalElements).toBe(commentListCount + 3);

      expect(result.list[1].commentContent).toBe(`reply${boardCommentContentPrefix}1`);
      expect(result.list[2].commentContent).toBe(`reply${boardCommentContentPrefix}3`);
      expect(result.list[3].commentContent).toBe(`reply${boardCommentContentPrefix}2`);
    });

    it('정상 조회. 이미지 게시글 기준', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.imageNo = testImageBoard.imageNo;

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentService.getCommentListService(commentListDTO);

      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(commentAmount);
      expect(result.totalElements).toBe(commentListCount);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.boardNo = testBoard.boardNo;
      commentListDTO.pageNum = 2;

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentService.getCommentListService(commentListDTO);

      const contentSize: number = Math.min((commentListCount + 3 - commentAmount), commentAmount);

      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(contentSize);
      expect(result.totalElements).toBe(commentListCount + 3);
    });

    it('데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.boardNo = testBoard.boardNo;

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentService.getCommentListService(commentListDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it('모든 게시글 번호가 undefined인 경우', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();

      await expect(commentService.getCommentListService(commentListDTO))
        .rejects
        .toThrow('BAD_REQUEST');
    });

    it('모든 게시글 번호가 존재하는 경우', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.boardNo = testBoard.boardNo;
      commentListDTO.imageNo = testImageBoard.imageNo;

      await expect(commentService.getCommentListService(commentListDTO))
        .rejects
        .toThrow('BAD_REQUEST');
    });
  });

  describe('postCommentService', () => {
    const postDTO: CommentPostRequestDTO = new CommentPostRequestDTO();
    postDTO.commentContent = 'testPostCommentContent';
    it('정상 처리. 일반 게시글 기준', async () => {
      await commentService.postCommentService(postDTO, member.userId, { boardNo: testBoard.boardNo });

      const comment: Comment[] = await commentRepository.find({ where: { boardNo: testBoard.boardNo }, order: { 'commentNo': 'DESC' } });
      const saveComment: Comment = comment[0];

      expect(saveComment.userId).toBe(member.userId);
      expect(saveComment.commentContent).toBe(postDTO.commentContent);
      expect(saveComment.commentGroupNo).toBe(saveComment.commentNo);
      expect(saveComment.commentUpperNo).toBe(`${saveComment.commentNo}`);
      expect(saveComment.commentIndent).toBe(1);
      expect(saveComment.imageNo).toBeNull();
    });

    it('정상 처리. 이미지 게시글 기준', async () => {
      await commentService.postCommentService(postDTO, member.userId, { imageNo: testImageBoard.imageNo });

      const comment: Comment[] = await commentRepository.find({ where: { imageNo: testImageBoard.imageNo }, order: { 'commentNo': 'DESC' } });
      const saveComment: Comment = comment[0];

      expect(saveComment.userId).toBe(member.userId);
      expect(saveComment.commentContent).toBe(postDTO.commentContent);
      expect(saveComment.commentGroupNo).toBe(saveComment.commentNo);
      expect(saveComment.commentUpperNo).toBe(`${saveComment.commentNo}`);
      expect(saveComment.commentIndent).toBe(1);
      expect(saveComment.boardNo).toBeNull();
    });

    it('두 게시글 번호가 모두 존재하는 경우', async () => {
      await expect(commentService.postCommentService(postDTO, member.userId, { boardNo: testBoard.boardNo, imageNo: testImageBoard.imageNo }))
        .rejects
        .toThrow('BAD_REQUEST');
    });

    it('두 게시글 번호가 모두 undefined인 경우', async () => {
      await expect(commentService.postCommentService(postDTO, member.userId, {}))
        .rejects
        .toThrow('BAD_REQUEST');
    });
  });

  describe('deleteCommentService', () => {
    it('정상 처리', async () => {
      await commentService.deleteCommentService(testComment.commentNo, member.userId);

      const deleteComment: Comment | null = await commentRepository.findOne({ where: { commentNo: testComment.commentNo } });

      expect(deleteComment).toBeNull();
    });

    it('데이터가 없는 경우', async () => {
      await expect(commentService.deleteCommentService(0, member.userId))
        .rejects
        .toThrow('NOT_FOUND');
    });

    it('작성자가 아닌 경우', async () => {
      await expect(commentService.deleteCommentService(testComment.commentNo, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');
    });
  });

  describe('postReplyService', () => {
    const getReplyDTO = (): CommentPostReplyRequestDTO => {
      const replyDTO: CommentPostReplyRequestDTO = new CommentPostReplyRequestDTO();
      replyDTO.commentContent = 'testReplyCommentContent';
      replyDTO.commentGroupNo = testComment.commentGroupNo;
      replyDTO.commentIndent = testComment.commentIndent;
      replyDTO.commentUpperNo = testComment.commentUpperNo;

      return replyDTO;
    }

    it('정상 처리. 일반 게시글 기준', async () => {
      const postReplyDTO: CommentPostReplyRequestDTO = getReplyDTO();

      await commentService.postReplyService(postReplyDTO, member.userId, { boardNo: testBoard.boardNo });

      const comments: Comment[] = await commentRepository.find({ where: { boardNo: testBoard.boardNo }, order: { 'commentNo': 'DESC' } });
      const reply: Comment = comments[0];

      expect(reply.commentContent).toBe(postReplyDTO.commentContent);
      expect(reply.commentGroupNo).toBe(postReplyDTO.commentGroupNo);
      expect(reply.commentUpperNo).toBe(`${postReplyDTO.commentUpperNo},${reply.commentNo}`);
      expect(reply.commentIndent).toBe(postReplyDTO.commentIndent + 1);
      expect(reply.imageNo).toBeNull();
    });

    it('정상 처리. 이미지 게시글 기준', async () => {
      const postReplyDTO: CommentPostReplyRequestDTO = getReplyDTO();

      await commentService.postReplyService(postReplyDTO, member.userId, { imageNo: testImageBoard.imageNo });

      const comments: Comment[] = await commentRepository.find({ where: { imageNo: testImageBoard.imageNo }, order: { 'commentNo': 'DESC' } });
      const reply: Comment = comments[0];

      expect(reply.commentContent).toBe(postReplyDTO.commentContent);
      expect(reply.commentGroupNo).toBe(postReplyDTO.commentGroupNo);
      expect(reply.commentUpperNo).toBe(`${postReplyDTO.commentUpperNo},${reply.commentNo}`);
      expect(reply.commentIndent).toBe(postReplyDTO.commentIndent + 1);
      expect(reply.boardNo).toBeNull();
    });

    it('게시글 번호가 둘다 undefined인 경우', async () => {
      const postReplyDTO: CommentPostReplyRequestDTO = getReplyDTO();

      await expect(commentService.postReplyService(postReplyDTO, member.userId, { }))
        .rejects
        .toThrow('BAD_REQUEST');
    });

    it('게시글 번호가 둘다 존재하는 경우', async () => {
      const postReplyDTO: CommentPostReplyRequestDTO = getReplyDTO();

      await expect(commentService.postReplyService(postReplyDTO, member.userId, { boardNo: testBoard.boardNo, imageNo: testImageBoard.imageNo }))
        .rejects
        .toThrow('BAD_REQUEST');
    });
  });
});