import { Brackets, DataSource, Repository } from 'typeorm';
import { Board } from '#board/entities/board.entity';
import { Injectable } from '@nestjs/common';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { getPaginationOffset, setKeyword } from '#common/utils/pagination-offset.utils';
import { BoardListResponse } from '#board/dtos/out/board-list.response.dto';
import { BoardDetailResponse } from '#board/dtos/out/board-detail.response.dto';
import { PostReplyRequest } from '#board/dtos/in/post-reply.request.dto';
import { PostBoardRequest } from '#board/dtos/in/post-board.request.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';

@Injectable()
export class BoardRepository extends Repository<Board> {
  constructor(private dataSource: DataSource) {
    super(Board, dataSource.manager);
  }

  async getBoardList(pageDTO: PaginationDTO): Promise<ListResponse<BoardListResponse>> {
    const boardAmount: number = PAGE_AMOUNT.BOARD;
    const offset: number = getPaginationOffset(pageDTO.page!, boardAmount);
    const keyword: string = setKeyword(pageDTO.keyword);

    const query = this.createQueryBuilder('board')
      .leftJoinAndSelect('board.member', 'member')
      .select([
        'board.id',
        'board.title',
        'member.id',
        'member.nickname',
        'board.createdAt',
        'board.indent',
        'board.groupNo',
        'board.upperNo'
      ])
      .skip(offset)
      .take(boardAmount)
      .orderBy('board.groupNo', 'DESC')
      .addOrderBy('board.upperNo', 'ASC');

    if(keyword) {
      query.andWhere(new Brackets((qb) => {
        if(pageDTO.searchType === 't' || pageDTO.searchType === 'tc')
          qb.orWhere('board.title LIKE :keyword');

        if(pageDTO.searchType === 'c' || pageDTO.searchType === 'tc')
          qb.orWhere('board.content LIKE :keyword');

        if(pageDTO.searchType === 'u')
          qb.orWhere('member.nickname LIKE :keyword')
      }), { keyword })
    }

    const [ lists, totalElements ] = await query.getManyAndCount();

    const list: BoardListResponse[] = lists.map(
      (entity: Board): BoardListResponse => new BoardListResponse(entity)
    );

    return new ListResponse(list, totalElements, boardAmount, pageDTO.page);
  }

  async getBoardDetail(id: number): Promise<BoardDetailResponse | null> {
    const board = await this.createQueryBuilder('board')
      .leftJoinAndSelect('board.member', 'member')
      .select([
        'board.title',
        'board.content',
        'board.createdAt',
        'member.id',
        'member.nickname',
        'member.userId'
      ])
      .where('board.id = :id', { id })
      .getOne();

    if(!board)
      return null;

    return new BoardDetailResponse(board);
  }

  async postBoard(postDTO: PostBoardRequest, userId: number): Promise<number> {
    const board: Board = this.create({
      userId,
      title: postDTO.title,
      content: postDTO.content,
      indent: 0
    });

    const saveBoard: Board = await this.save(board);
    saveBoard.groupNo = saveBoard.id;
    saveBoard.upperNo = `${saveBoard.id}`;

    await this.save(saveBoard);

    return saveBoard.id;
  }

  async findById(id: number): Promise<Board | null> {
    return await this.createQueryBuilder('board').where({ id }).getOne();
  }

  async postReply(replyDTO: PostReplyRequest, targetBoard: Board, userId: number): Promise<number> {
    const reply: Board = this.create({
      userId,
      title: replyDTO.title,
      content: replyDTO.content,
      groupNo: targetBoard.groupNo,
      indent: targetBoard.indent + 1
    });

    const saveReply: Board = await this.save(reply);

    saveReply.upperNo = `${targetBoard.upperNo},${saveReply.id}`;

    await this.save(saveReply);

    return saveReply.id;
  }
  
  async patchBoard(id: number, patchRequest: PostBoardRequest): Promise<void> {
    await this.createQueryBuilder()
      .update(Board)
      .set({
        title: patchRequest.title,
        content: patchRequest.content
      })
      .where("id = :id", { id })
      .execute();
  }

  async findWriterById(id: number): Promise<number | null> {
    const board = await this.createQueryBuilder('board')
      .select(['board.userId'])
      .where({ id })
      .getOne();

    return board ? board.userId : null;
  }

  async findPatchDetailById(id: number): Promise<Board | null> {
    return await this.createQueryBuilder('board')
      .select([
        'board.title',
        'board.content',
        'board.userId'
      ])
      .where({ id })
      .getOne();
  }

  async deleteById(id: number): Promise<void> {
    await this.delete({ id });
  }

  async deleteByGroupNo(id: number): Promise<void> {
    await this.delete({ groupNo: id });
  }

  async deleteByPath(targetGroupNo: number, selfUpperNo: string, childUpperNo: string): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(Board)
      .where('groupNo = :targetGroupNo', { targetGroupNo })
      .andWhere(
        new Brackets((qb) => {
          qb.where('upperNo = :selfUpperNo', { selfUpperNo })
            .orWhere('upperNo LIKE :childUpperNo', { childUpperNo })
        }),
      )
      .execute();
  }
}