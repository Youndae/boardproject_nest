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
import { CommentListRequestDTO } from '#comment/dtos/in/comment-list-request.dto';
import { CommentListResponseDTO } from '#comment/dtos/out/comment-list-response.dto';
import { CommentPostRequestDTO } from '#comment/dtos/in/comment-post-request.dto';
import { CommentPostReplyRequestDTO } from '#comment/dtos/in/comment-post-reply-request.dto';

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

  describe('getCommentList', () => {
    it('정상 조회. 일반 게시글 기준', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.boardNo = testBoard.boardNo;

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentRepository.getCommentList(commentListDTO);

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
      } = await commentRepository.getCommentList(commentListDTO);

      expect(result.list).not.toStrictEqual([]);
      expect(result.list.length).toBe(commentAmount);
      expect(result.totalElements).toBe(commentListCount);
    });

    it('데이터가 없는 경우', async () => {
      await commentRepository.deleteAll();

      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();
      commentListDTO.imageNo = testImageBoard.imageNo;

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentRepository.getCommentList(commentListDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it('모든 게시글 번호가 undefined인 경우', async () => {
      const commentListDTO: CommentListRequestDTO = new CommentListRequestDTO();

      const result: {
        list: CommentListResponseDTO[],
        totalElements: number
      } = await commentRepository.getCommentList(commentListDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    })
  });

  describe('postComment', () => {
    const postDTO: CommentPostRequestDTO = new CommentPostRequestDTO();
    postDTO.commentContent = 'testPostCommentContent';
    it('정상 처리. 일반 게시글 기준', async () => {
      await commentRepository.postComment(postDTO, member.userId, { boardNo: testBoard.boardNo, imageNo: null });

      const saveComment: Comment[] = await commentRepository.find({ where: { boardNo: testBoard.boardNo }, order: { 'commentNo': 'DESC' } });
      const comment: Comment = saveComment[0];
      expect(comment.commentContent).toBe(postDTO.commentContent);
      expect(comment.userId).toBe(member.userId);
      expect(comment.commentGroupNo).toBe(comment.commentNo);
      expect(comment.commentUpperNo).toBe(`${comment.commentNo}`);
    });

    it('정상 처리. 이미지 게시글 기준', async () => {
      await commentRepository.postComment(postDTO, member.userId, { boardNo: null, imageNo: testImageBoard.imageNo });

      const saveComment: Comment[] = await commentRepository.find({ where: { imageNo: testImageBoard.imageNo }, order: { 'commentNo': 'DESC' } });
      const comment: Comment = saveComment[0];
      expect(comment.commentContent).toBe(postDTO.commentContent);
      expect(comment.userId).toBe(member.userId);
      expect(comment.commentGroupNo).toBe(comment.commentNo);
      expect(comment.commentUpperNo).toBe(`${comment.commentNo}`);
    });
  });

  describe('postReplyComment', () => {
    const getCommentReplyPostDTO = (): CommentPostReplyRequestDTO => {
      const dto: CommentPostReplyRequestDTO = new CommentPostReplyRequestDTO();
      dto.commentContent = 'testReplyCommentContent';
      dto.commentGroupNo = testComment.commentGroupNo;
      dto.commentIndent = testComment.commentIndent;
      dto.commentUpperNo = testComment.commentUpperNo;

      return dto;
    }
    it('정상 처리. 일반 게시글 기준', async () => {
      const replyDTO: CommentPostReplyRequestDTO = getCommentReplyPostDTO();

      await commentRepository.postReplyComment(
        replyDTO,
        member.userId,
        { boardNo: testBoard.boardNo, imageNo: null }
      );

      const saveReply: Comment[] = await commentRepository.find({ where: { boardNo: testBoard.boardNo }, order: { 'commentNo': 'DESC' } });
      const reply: Comment = saveReply[0];

      expect(reply.commentContent).toBe(replyDTO.commentContent);
      expect(reply.commentGroupNo).toBe(replyDTO.commentGroupNo);
      expect(reply.commentIndent).toBe(replyDTO.commentIndent + 1);
      expect(reply.commentUpperNo).toBe(`${replyDTO.commentUpperNo},${reply.commentNo}`);
    });

    it('정상 처리. 이미지 게시글 기준', async () => {
      const replyDTO: CommentPostReplyRequestDTO = getCommentReplyPostDTO();

      await commentRepository.postReplyComment(
        replyDTO,
        member.userId,
        { boardNo: null, imageNo: testImageBoard.imageNo }
      );

      const saveReply: Comment[] = await commentRepository.find({ where: { imageNo: testImageBoard.imageNo }, order: { 'commentNo': 'DESC' } });
      const reply: Comment = saveReply[0];

      expect(reply.commentContent).toBe(replyDTO.commentContent);
      expect(reply.commentGroupNo).toBe(replyDTO.commentGroupNo);
      expect(reply.commentIndent).toBe(replyDTO.commentIndent + 1);
      expect(reply.commentUpperNo).toBe(`${replyDTO.commentUpperNo},${reply.commentNo}`);
    });
  });
});