import { Injectable } from '@nestjs/common';
import { BoardRepository } from '#board/repositories/board.repository';
import { LoggerService } from '#config/logger/logger.service';
import { Board } from '#board/entities/board.entity';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { PostReplyRequest } from '#board/dtos/in/post-reply.request.dto';
import { BoardListResponse } from '#board/dtos/out/board-list.response.dto';
import { BoardDetailResponse } from '#board/dtos/out/board-detail.response.dto';
import { PostBoardRequest } from '#board/dtos/in/post-board.request.dto';
import { BoardPatchDetailResponse } from '#board/dtos/out/board-patch-detail.response.dto';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { Transactional } from 'typeorm-transactional';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';

@Injectable()
export class BoardService {
  private readonly logger: LoggerService;

  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly originalLogger: LoggerService
  ) {
    this.logger = this.originalLogger.setContext(BoardService.name);
  }
  
  async getListService(pageDTO: PaginationDTO): Promise<ListResponse<BoardListResponse>> {
    this.logger.info('getListService ', { pageDTO }, BoardService.name);
    return await this.boardRepository.getBoardList(pageDTO);
  }

  async getDetailService(boardNo: number): Promise<BoardDetailResponse> {
    const boardDetail: BoardDetailResponse | null = await this.boardRepository.getBoardDetail(boardNo);

    if(!boardDetail) {
      this.logger.error(
        'getDetailService :: NotFoundException.',
        { boardNo },
      );
      throw new BadRequestException();
    }

    return boardDetail;
  }
  
  @Transactional()
  async postBoardService(postBoardDTO: PostBoardRequest, userId: number): Promise<number> {
    return await this.boardRepository.postBoard(postBoardDTO, userId);
  }

  async getBoardPatchDataService(id: number, userId: number): Promise<BoardPatchDetailResponse> {
    const board = await this.boardRepository.findPatchDetailById(id);

    if(!board){
      this.logger.warn('getBoardPatchDataService :: patch detail data not found.', {id});
      throw new BadRequestException();
    }

    if(board.userId !== userId) {
      this.logger.warn('getBoardPatchDataService :: writer mismatch', {userId});
      throw new AccessDeniedException();
    }

    return new BoardPatchDetailResponse(board);
  }
  
  @Transactional()
  async patchBoardService(id: number, patchBoardDTO: PostBoardRequest, userId: number): Promise<number> {
    await this.checkWriter(id, userId);
    await this.boardRepository.patchBoard(id, patchBoardDTO);

    return id;
  }
  
  @Transactional()
  async deleteBoardService(id: number, userId: number): Promise<void> {
    await this.checkWriter(id, userId);

    const targetBoard: Board | null = await this.boardRepository.findById(id);

    if(!targetBoard){
      this.logger.error('deleteBoardService :: target board not found', { id });
      throw new InternalServerErrorException();
    }

    if(targetBoard.indent === 0){
      await this.boardRepository.deleteByGroupNo(id);
    }else {
      const selfUpperNo = targetBoard.upperNo;
      const childUpperNo = `${targetBoard.upperNo},%`;

      await this.boardRepository.deleteByPath(targetBoard.groupNo, selfUpperNo, childUpperNo);
    }

    await this.boardRepository.deleteById(id);
  }
  
  async getReplyDataService(id: number): Promise<void> {
    const board = await this.boardRepository.findById(id);

    if(!board){
      this.logger.warn(
        'getReplyPostDataService :: board not found.',
        { id },
      );
      throw new BadRequestException();
    }
  }

  async postBoardReplyService(replyDTO: PostReplyRequest, targetId: number, userId: number): Promise<number> {
    const targetBoard: Board | null = await this.boardRepository.findById(targetId);

    if(!targetBoard){
      this.logger.warn(
        'postBoardReplyService :: target board not found.',
        { targetId }
      );
      throw new BadRequestException();
    }

    return await this.boardRepository.postReply(replyDTO, targetBoard, userId);
  }

  private async checkWriter(id: number, userId: number): Promise<void> {
    const writer: number | null = await this.boardRepository.findWriterById(id);

    if(!writer){
      this.logger.error(
        'checkWriter :: NotFoundException.',
        { id },
      );
      throw new BadRequestException();
    }


    if(writer !== userId){
      this.logger.error('checkWriter :: AccessDeniedException.',
        { userId }
      );
      throw new AccessDeniedException();
    }
  }
}
