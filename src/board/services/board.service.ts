import { Injectable } from '@nestjs/common';
import { BoardRepository } from '#board/repositories/board.repository';
import { LoggerService } from '#config/logger/logger.service';
import { Board } from '#board/entities/board.entity';

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
   * }
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
  async getListService({ keyword, searchType, pageNum = 1}: { keyword?: string, searchType?: string, pageNum?: number}): Promise<void> {

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
  async getDetailService(boardNo: number): Promise<void> {

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
  async postBoardService(postBoardDTO: any, userId: string): Promise<void> {

  }

  /**
   *
   * @param boardNo
   *
   * @returns {
   *   {
   *     boardNo: number,
   *     boardTitle: string,
   *     boardContent: string
   *   } patchBoardResponseDTO
   * }
   */
  async getBoardPatchDataService(boardNo: number): Promise<void> {

  }

  /**
   *
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
  async patchBoardService(patchBoardDTO: any, userId: string): Promise<void> {

  }

  /**
   *
   * @param boardNo
   * @param userId
   *
   * @return void
   */
  async deleteBoardService(boardNo: number, userId: string): Promise<void> {

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
   *   } BoardReplyResponseDTO
   * }
   */
  async getReplyPostDataService(boardNo: number): Promise<void> {

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
  async postBoardReplyService(replyDTO: any, userId: string): Promise<void> {

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
   * @exception 403 FORBIDDEN
   *
   * Board not found
   * @exception 400 BAD_REQUEST
   */
  private async checkWriter(userId: string, boardNo: number): Promise<void> {

  }
}
