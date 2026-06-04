import { MemberRepository } from '#member/repositories/member.repository';
import { BoardRepository } from '#board/repositories/board.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { Board } from '#board/entities/board.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { MemberModule } from '#member/member.module';
import { BoardModule } from '#board/board.module';
import { ImageBoardModule } from '#imageBoard/image-board.module';
import { CommentModule } from '#comment/comment.module';
import { Member } from '#member/entities/member.entity';
import { Comment } from '#comment/entities/comment.entity';
import { CommentListRequest } from '#comment/dtos/in/comment-list.request.dto';
import { CommentListResponse } from '#comment/dtos/out/comment-list.response.dto';
import { PostCommentRequest } from '#comment/dtos/in/post-comment.request.dto';
import { CommentPostReplyRequest } from '#comment/dtos/in/comment-post-reply.request.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { COMMENT_TARGET } from '#comment/constants/comment-list-type.constants';
import { getTotalPages } from '../../utils/pagination.utils';

describe('commentRepository', () => {
  let memberRepository: MemberRepository;
  let boardRepository: BoardRepository;
  let imageBoardRepository: ImageBoardRepository;
  let commentRepository: CommentRepository;

  let dataSource: DataSource;
  let app: INestApplication;

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
        TestDatabaseModule,
        MemberModule,
        BoardModule,
        ImageBoardModule,
        CommentModule
      ],
      providers: [
        MemberRepository,
        BoardRepository,
        ImageBoardRepository,
        CommentRepository
      ]
    })
      .compile();

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
          indent: 0
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
        indent: 2
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
        indent: 3
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

  describe('getCommentList', () => {
    it('정상 조회. 일반 게시글 기준', async () => {
      const commentListDTO: CommentListRequest = new CommentListRequest();
      commentListDTO.id = testBoard.id;

      // reply 3개 추가 필요.
      const totalPageFixture: number = getTotalPages(commentListCount + 3, commentAmount);

      const result: ListResponse<CommentListResponse> = await commentRepository.getCommentList(commentListDTO, COMMENT_TARGET.BOARD);

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

      const totalPageFixture: number = getTotalPages(commentListCount, commentAmount);
      const result: ListResponse<CommentListResponse> = await commentRepository.getCommentList(commentListDTO, COMMENT_TARGET.IMAGE);

      expect(result.items).not.toStrictEqual([]);
      expect(result.items.length).toBe(commentAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
    });

    it('데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();

      const commentListDTO: CommentListRequest = new CommentListRequest();
      commentListDTO.id = testImageBoard.id;

      const result: ListResponse<CommentListResponse> = await commentRepository.getCommentList(commentListDTO, COMMENT_TARGET.IMAGE);

      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });
  });

  describe('postComment', () => {
    const postDTO: PostCommentRequest = new PostCommentRequest();
    postDTO.content = 'testPostCommentContent';
    it('정상 처리. 일반 게시글 기준', async () => {
      await commentRepository.postComment(postDTO, member.id, { boardId: testBoard.id, imageId: null });

      const saveComment: Comment[] = await commentRepository.find({ where: { boardId: testBoard.id }, order: { 'id': 'DESC' } });
      const comment: Comment = saveComment[0];
      expect(comment.content).toBe(postDTO.content);
      expect(comment.userId).toBe(member.id);
      expect(comment.groupNo).toBe(comment.id);
      expect(comment.upperNo).toBe(`${comment.id}`);
      expect(comment.indent).toBe(0);
    });

    it('정상 처리. 이미지 게시글 기준', async () => {
      await commentRepository.postComment(postDTO, member.id, { boardId: null, imageId: testImageBoard.id });

      const saveComment: Comment[] = await commentRepository.find({ where: { imageId: testImageBoard.id }, order: { 'id': 'DESC' } });
      const comment: Comment = saveComment[0];
      expect(comment.content).toBe(postDTO.content);
      expect(comment.userId).toBe(member.id);
      expect(comment.groupNo).toBe(comment.id);
      expect(comment.upperNo).toBe(`${comment.id}`);
      expect(comment.indent).toBe(0);
    });
  });

  describe('postReplyComment', () => {
      const replyRequest: CommentPostReplyRequest = new CommentPostReplyRequest();
      replyRequest.content = 'testReplyCommentContent';
    it('정상 처리. 일반 게시글 기준', async () => {
      await commentRepository.postReplyComment(
        replyRequest,
        member.id,
        testComment
      );

      const saveReply: Comment[] = await commentRepository.find({ where: { boardId: testBoard.id }, order: { 'id': 'DESC' } });
      const reply: Comment = saveReply[0];

      expect(reply.content).toBe(replyRequest.content);
      expect(reply.groupNo).toBe(testComment.groupNo);
      expect(reply.indent).toBe(testComment.indent + 1);
      expect(reply.upperNo).toBe(`${testComment.upperNo},${reply.id}`);
      expect(reply.boardId).toBe(testComment.boardId);
      expect(reply.imageId).toBe(testComment.imageId);
    });
  });
});