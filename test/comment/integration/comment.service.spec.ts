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
import { CommentListRequest } from '#comment/dtos/in/comment-list.request.dto';
import { CommentListResponse } from '#comment/dtos/out/comment-list.response.dto';
import { PostCommentRequest } from '#comment/dtos/in/post-comment.request.dto';
import { CommentPostReplyRequest } from '#comment/dtos/in/comment-post-reply.request.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { COMMENT_TARGET } from '#comment/constants/comment-list-type.constants';
import { getTotalPages } from '../../utils/pagination.utils';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';

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

  const commentAmount: number = PAGE_AMOUNT.COMMENT;

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

    const board: Board = boardRepository.create({
      userId: member.id,
      title: 'testBoardTitle',
      content: 'testBoardContent',
      indent: 0
    });

    const saveBoard: Board = await boardRepository.save(board);
    saveBoard.groupNo = saveBoard.id;
    saveBoard.upperNo = `${saveBoard.id}`;

    await boardRepository.save(saveBoard);

    testBoard = saveBoard;

    const imageBoard: ImageBoard = imageBoardRepository.create({
      userId: member.id,
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
          userId: member.id,
          content: `${boardCommentContentPrefix}${i}`,
          indent: 0
        })
      );

      commentArr.push(
        commentRepository.create({
          boardId: null,
          imageId: testImageBoard.id,
          userId: member.id,
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
        userId: member.id,
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
        userId: member.id,
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
        userId: member.id,
        content: `reply${boardCommentContentPrefix}3`,
        groupNo: replyEntity.groupNo,
        upperNo: `${replyEntity.upperNo},${commentReplyStartNo - 2},${commentReplyStartNo}`,
        indent: 2
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
      const commentListDTO: CommentListRequest = new CommentListRequest();
      commentListDTO.id = testBoard.id;
      // reply 3개 포함
      const totalPageFixture: number = getTotalPages(commentListCount + 3, commentAmount);
      const result: ListResponse<CommentListResponse> = await commentService.getCommentListService(commentListDTO, COMMENT_TARGET.BOARD);

      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(commentAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);

      expect(result.items[1].content).toBe(`reply${boardCommentContentPrefix}1`);
      expect(result.items[2].content).toBe(`reply${boardCommentContentPrefix}3`);
      expect(result.items[3].content).toBe(`reply${boardCommentContentPrefix}2`);
    });

    it('정상 조회. 이미지 게시글 기준', async () => {
      const commentListDTO: CommentListRequest = new CommentListRequest();
      commentListDTO.id = testImageBoard.id;

      // image comment는 reply fixture가 없으므로 + 3 하지 않음
      const totalPageFixture = getTotalPages(commentListCount, commentAmount);
      const result: ListResponse<CommentListResponse> = await commentService.getCommentListService(commentListDTO, COMMENT_TARGET.IMAGE);

      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(commentAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const commentListDTO: CommentListRequest = new CommentListRequest();
      commentListDTO.id = testBoard.id;
      commentListDTO.page = 2;

      const totalPageFixture: number = getTotalPages(commentListCount + 3, commentAmount);
      const result: ListResponse<CommentListResponse> = await commentService.getCommentListService(commentListDTO, COMMENT_TARGET.BOARD);

      const contentSize: number = Math.min((commentListCount + 3 - commentAmount), commentAmount);

      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(contentSize);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(2);
    });

    it('데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();
      const commentListDTO: CommentListRequest = new CommentListRequest();
      commentListDTO.id = testBoard.id;

      const result: ListResponse<CommentListResponse> = await commentService.getCommentListService(commentListDTO, COMMENT_TARGET.BOARD);

      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });
  });

  describe('postCommentService', () => {
    const postDTO: PostCommentRequest = new PostCommentRequest();
    postDTO.content = 'testPostCommentContent';
    it('정상 처리. 일반 게시글 기준', async () => {
      await commentService.postCommentService(postDTO, member.id, { boardId: testBoard.id });

      const comment: Comment[] = await commentRepository.find({ where: { boardId: testBoard.id }, order: { 'id': 'DESC' } });
      const saveComment: Comment = comment[0];

      expect(saveComment.userId).toBe(member.id);
      expect(saveComment.content).toBe(postDTO.content);
      expect(saveComment.groupNo).toBe(saveComment.id);
      expect(saveComment.upperNo).toBe(`${saveComment.id}`);
      expect(saveComment.indent).toBe(0);
      expect(saveComment.imageId).toBeNull();
      expect(saveComment.boardId).toBe(testBoard.id);
    });

    it('정상 처리. 이미지 게시글 기준', async () => {
      await commentService.postCommentService(postDTO, member.id, { imageId: testImageBoard.id });

      const comment: Comment[] = await commentRepository.find({ where: { imageId: testImageBoard.id }, order: { 'id': 'DESC' } });
      const saveComment: Comment = comment[0];

      expect(saveComment.userId).toBe(member.id);
      expect(saveComment.content).toBe(postDTO.content);
      expect(saveComment.groupNo).toBe(saveComment.id);
      expect(saveComment.upperNo).toBe(`${saveComment.id}`);
      expect(saveComment.indent).toBe(0);
      expect(saveComment.boardId).toBeNull();
      expect(saveComment.imageId).toBe(testImageBoard.id);
    });

    it('두 게시글 번호가 모두 존재하는 경우', async () => {
      await expect(commentService.postCommentService(postDTO, member.id, { boardId: testBoard.id, imageId: testImageBoard.id }))
        .rejects
        .toThrow(BadRequestException);
    });

    it('두 게시글 번호가 모두 undefined인 경우', async () => {
      await expect(commentService.postCommentService(postDTO, member.id, {}))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('deleteCommentService', () => {
    it('정상 처리', async () => {
      await commentService.deleteCommentService(testComment.id, member.id);

      const deleteComment: Comment | null = await commentRepository.findOne({ where: { id: testComment.id } });

      expect(deleteComment).toBeNull();
    });

    it('데이터가 없는 경우', async () => {
      await expect(commentService.deleteCommentService(0, member.id))
        .rejects
        .toThrow(BadRequestException);
    });

    it('작성자가 아닌 경우', async () => {
      await expect(commentService.deleteCommentService(testComment.id, 2))
        .rejects
        .toThrow(AccessDeniedException);
    });
  });

  describe('postReplyService', () => {
    const replyRequest: CommentPostReplyRequest = new CommentPostReplyRequest();
    replyRequest.content = 'testReplyCommentContent';
    it('정상 처리. 일반 게시글 기준', async () => {

      await commentService.postReplyService(replyRequest, testComment.id, member.id);

      const comments: Comment[] = await commentRepository.find({ where: { boardId: testBoard.id }, order: { 'id': 'DESC' } });
      const reply: Comment = comments[0];

      expect(reply.content).toBe(replyRequest.content);
      expect(reply.groupNo).toBe(testComment.groupNo);
      expect(reply.upperNo).toBe(`${testComment.upperNo},${reply.id}`);
      expect(reply.indent).toBe(testComment.indent + 1);
      expect(reply.imageId).toBe(testComment.imageId);
      expect(reply.boardId).toBe(testComment.boardId);
    });

    it('상위 댓글 데이터가 없는 경우', async () => {
      await expect(commentService.postReplyService(replyRequest, 0, member.id))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});