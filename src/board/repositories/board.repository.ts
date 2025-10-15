import { DataSource, Repository } from 'typeorm';
import { Board } from '#board/entities/board.entity';
import { Injectable } from '@nestjs/common';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { getPaginationOffset, setKeyword } from '#common/utils/pagination-offset.utils';
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { BoardDetailResponseDTO } from '#board/dtos/out/board-detail-response.dto';
import { NotFoundException } from '#common/exceptions/not-found.exception';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';
import { PostReplyDTO } from '#board/dtos/in/post-reply.dto';
import { PostBoardDto } from '#board/dtos/in/post-board.dto';

const boardAmount = 20;

@Injectable()
export class BoardRepository extends Repository<Board> {
  constructor(private dataSource: DataSource) {
    super(Board, dataSource.manager);
  }

  async getBoardList(pageDTO: PaginationDTO): Promise<{ list: BoardListResponseDTO[], totalElements: number }> {
    const offset: number = getPaginationOffset(pageDTO.pageNum!, boardAmount);
    const keyword: string = setKeyword(pageDTO.keyword);

    const query = this.createQueryBuilder('board')
      .select([
        'board.boardNo',
        'board.boardTitle',
        'board.userId',
        'board.boardDate',
        'board.boardIndent'
      ])
      .skip(offset)
      .take(boardAmount)
      .orderBy('board.boardGroupNo', 'DESC')
      .addOrderBy('board.boardUpperNo', 'ASC');

    if(keyword) {
      const searchConditions: string[] = [];

      if(pageDTO.searchType === 't' || pageDTO.searchType === 'tc')
        searchConditions.push('board.boardTitle LIKE :keyword');
      if(pageDTO.searchType === 'c' || pageDTO.searchType === 'tc')
        searchConditions.push('board.boardContent LIKE :keyword');
      if(pageDTO.searchType === 'u')
        searchConditions.push('board.userId LIKE :keyword');

      if(searchConditions.length)
        query.where(searchConditions.join(' OR '), { keyword });
    }

    const [ lists, totalElements ] = await query.getManyAndCount();

    const list: BoardListResponseDTO[] = lists.map(
      (entity: Board): BoardListResponseDTO => new BoardListResponseDTO(entity)
    );

    return { list, totalElements };
  }

  async getBoardDetail(boardNo: number): Promise<BoardDetailResponseDTO | null> {
    const board: Board | null = await this.findOne({
        select: ['boardNo', 'boardTitle', 'boardContent', 'userId', 'boardDate'],
        where: { boardNo }
      });

    if(!board)
      return null;

    return new BoardDetailResponseDTO(board);
  }

  async postBoard(postDTO: PostBoardDto, userId: string): Promise<number> {
    const board: Board = this.create({
      userId,
      boardTitle: postDTO.boardTitle,
      boardContent: postDTO.boardContent,
      boardIndent: 1
    });

    const saveBoard: Board = await this.save(board);
    saveBoard.boardGroupNo = saveBoard.boardNo;
    saveBoard.boardUpperNo = `${saveBoard.boardNo}`;

    await this.save(saveBoard);

    return saveBoard.boardNo;
  }

  async getReplyData(boardNo: number): Promise<BoardReplyDataDTO | null> {
    const board: Board | null = await this.findOne({
      select: ['boardGroupNo', 'boardUpperNo', 'boardIndent'],
      where: { boardNo }
    });

    if(!board)
      return null;

    return new BoardReplyDataDTO(board);
  }

  async postReply(replyDTO: PostReplyDTO, userId: string): Promise<number> {
    const reply: Board = this.create({
      userId,
      boardTitle: replyDTO.boardTitle,
      boardContent: replyDTO.boardContent,
      boardGroupNo: replyDTO.boardGroupNo,
      boardIndent: replyDTO.boardIndent + 1
    });

    const saveReply: Board = await this.save(reply);

    saveReply.boardUpperNo = `${replyDTO.boardUpperNo},${saveReply.boardNo}`;

    await this.save(saveReply);

    return saveReply.boardNo;
  }
}