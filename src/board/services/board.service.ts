import { Injectable } from '@nestjs/common';
import { BoardRepository } from '#board/repositories/board.repository';
import { LoggerService } from '#config/logger/logger.service';
import { Board } from '#board/entities/board.entity';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { PostReplyDTO } from '#board/dtos/in/post-reply.dto';
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { BoardDetailResponseDTO } from '#board/dtos/out/board-detail-response.dto';
import { NotFoundException } from '#common/exceptions/not-found.exception';
import { PostBoardDto } from '#board/dtos/in/post-board.dto';
import { BoardPatchDetailResponseDTO } from '#board/dtos/out/board-patch-detail-response.dto';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';

@Injectable()
export class BoardService {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly logger: LoggerService
  ) {}

  /**
   *
   * @param {
   *   keyword?: string,
   *   searchType?: string,
   *   pageNum?: number = 1
   * } pageDTO
   *
   * @returns {
   *   content: BoardListResponseDTO[] [
   *     {
   *       boardNo: number,
   *       boardTitle: string,
   *       userId: string,
   *       boardDate: Date,
   *       boardIndent: number
   *     }
   *   ],
   *   empty: boolean,
   *   totalElements: number,
   * }
   */
  async getListService(pageDTO: PaginationDTO): Promise<{
    list: BoardListResponseDTO[], totalElements: number
  }> {
    this.logger.info('boardService.getListService :: ', { pageDTO });
    const listAndElements: {
      list: BoardListResponseDTO[],
      totalElements: number
    } = await this.boardRepository.getBoardList(pageDTO);

    return {
      list: listAndElements.list,
      totalElements: listAndElements.totalElements
    };
  }

  /**
   *
   * @param boardNo
   *
   * @returns {
   *   {
   *     boardNo: number,
   *     boardTitle: string,
   *     boardContent: string,
   *     userId: string,
   *     boardDate: Date
   *   } BoardDetailDTO
   * }
   */
  async getDetailService(boardNo: number): Promise<BoardDetailResponseDTO> {
    const boardDetail: BoardDetailResponseDTO | null = await this.boardRepository.getBoardDetail(boardNo);

    if(!boardDetail) {
      this.logger.error('boardService.getDetailService NotFoundException. boardNo : ', boardNo);
      throw new NotFoundException();
    }

    return boardDetail;
  }

  /**
   *
   * @param {
   *   boardTitle: string,
   *   boardContent: string
   * }postBoardDTO
   * @param userId
   *
   * @returns {
   *   boardNo: number
   * }
   */
  async postBoardService(postBoardDTO: PostBoardDto, userId: string): Promise<{ boardNo: number }> {
    this.logger.info('boardService.postBoardService :: ', { postBoardDTO, userId });
    const boardNo: number = await this.boardRepository.postBoard(postBoardDTO, userId);

    return { boardNo };
  }

  /**
   *
   * @param boardNo
   * @param userId
   *
   * @returns {
   *   {
   *     boardNo: number,
   *     boardTitle: string,
   *     boardContent: string
   *   } patchBoardResponseDTO
   * }
   */
  async getBoardPatchDataService(boardNo: number, userId: string): Promise<BoardPatchDetailResponseDTO> {
    this.logger.info('boardService.getBoardPatchDataService :: ', { boardNo, userId });
    const board: Board = await this.checkWriter(boardNo, userId);

    return new BoardPatchDetailResponseDTO(board);
  }

  /**
   *
   * @param boardNo
   * @param {
   *   boardTitle: string,
   *   boardContent: string
   * }patchBoardDTO
   * @param userId
   *
   * @returns {
   *   boardNo: number
   * }
   */
  async patchBoardService(boardNo: number, patchBoardDTO: PostBoardDto, userId: string): Promise<{ boardNo: number }> {
    this.logger.info('boardService.patchBoardService :: ', { boardNo, patchBoardDTO, userId });
    const patchBoard: Board = await this.checkWriter(boardNo, userId);

    patchBoard.boardTitle = patchBoardDTO.boardTitle;
    patchBoard.boardContent = patchBoardDTO.boardContent;

    await this.boardRepository.save(patchBoard);

    return { boardNo };
  }

  /**
   *
   * @param boardNo
   * @param userId
   *
   * @return void
   */
  async deleteBoardService(boardNo: number, userId: string): Promise<void> {
    this.logger.info('boardService.deleteBoardService :: ', { boardNo, userId });
    await this.checkWriter(boardNo, userId);

    await this.boardRepository.delete({ boardNo });
  }

  /**
   *
   * @param boardNo
   *
   * @returns {
   *   {
   *     boardGroupNo: number,
   *     boardUpperNo: string,
   *     boardIndent: number
   *   } BoardReplyDataDTO
   * }
   */
  async getReplyDataService(boardNo: number): Promise<BoardReplyDataDTO> {
    const replyData: BoardReplyDataDTO | null = await this.boardRepository.getReplyData(boardNo);

    if(!replyData){
      this.logger.error('boardService.getReplyPostDataService NotFoundException. boardNo : ', boardNo);
      throw new NotFoundException();
    }

    return replyData;
  }

  /**
   *
   * @param {
   *   boardTitle: string,
   *   boardContent: string,
   *   boardGroupNo: number,
   *   boardIndent: number,
   *   boardUpperNo: string
   * }replyDTO
   *
   * @param userId
   *
   * @returns {
   *   boardNo: number
   * }
   */
  async postBoardReplyService(replyDTO: PostReplyDTO, userId: string): Promise<{ boardNo: number }> {
    this.logger.info('boardService.postBoardReplyService :: ', { postReplyDTO: replyDTO, userId });

    const upperBoard: Board | null = await this.boardRepository.findOne({ where: { boardNo: replyDTO.boardGroupNo } });

    if(!upperBoard)
      throw new NotFoundException();

    const boardNo: number = await this.boardRepository.postReply(replyDTO, userId);

    return { boardNo };
  }

  /**
   *
   * @param userId
   * @param boardNo
   * @private
   *
   * @return Board
   *
   * not equals
   * @exception 403 ACCESS_DENIED
   *
   * Board not found
   * @exception 404 NOT_FOUND
   */
  private async checkWriter(boardNo: number, userId: string): Promise<Board> {
    const board: Board | null = await this.boardRepository.findOne({ where: { boardNo} });

    if(!board){
      this.logger.error('boardService.checkWriter NotFoundException. boardNo: ', boardNo);
      throw new NotFoundException();
    }


    if(board.userId !== userId){
      this.logger.error('boardService.checkWriter AccessDeniedException. userId : ', userId);
      throw new AccessDeniedException();
    }

    return board;
  }
}
