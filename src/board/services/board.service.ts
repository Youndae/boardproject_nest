import { Injectable } from '@nestjs/common';
import { BoardRepository } from '#board/repositories/board.repository';
import { LoggerService } from '#config/logger/logger.service';
import { Board } from '#board/entities/board.entity';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';

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
  async getListService(pageDTO: PaginationDTO): Promise<void> {
    // TODO: boardList: BoardListResponseDTO = repository.getBoardList(pageDTO);
    // TODO: repository.getBoardTotalElements(pageDTO); || getBoardList(pageDTO)에서 같이 조회하고 객체로 반환

    // TODO: return { content: boardList, empty: boardList.length !== 0, totalElements: totalElements }
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
    // TODO: boardDetail: BoardDetailDTO = repository.getBoardDetail(boardNo);

    // TODO: return boardDetail
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
    // TODO: const saveBoard: Board = repository.create({ ... })
    // TODO: const saveNo: number = repository.save(saveBoard).boardNo;

    // TODO: return { boardNo: saveNo }
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
  async getBoardPatchDataService(boardNo: number, userId: string): Promise<void> {
    // TODO: const board: Board = this.checkWriter(boardNo, userId)

    // TODO: return new PatchBoardResponseDTO(board);
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
  async patchBoardService(boardNo: number, patchBoardDTO: any, userId: string): Promise<void> {
    // TODO: const patchBoard: Board = this.checkWriter(boardNo, userId);

    // TODO: patchBoard.boardTitle = patchBoardDTO.boardTitle; patchBoard.boardContent = patchBoardDTO.boardContent;

    // TODO: repository.save(patchBoard);

    // TODO: return boardNo;
  }

  /**
   *
   * @param boardNo
   * @param userId
   *
   * @return void
   */
  async deleteBoardService(boardNo: number, userId: string): Promise<void> {
    // TODO: this.checkWriter(boardNo, userId);

    // TODO: repository.deleteOne({ where: { boardNo } });
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
  async getReplyPostDataService(boardNo: number): Promise<void> {
    // TODO: const reply: BoardReplyDataDTO = repository.getReplyData(boardNo);

    // TODO: return reply;
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
    // TODO: return repository.postReply(replyDTO, userId);
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
    // TODO: const board: Board = repository.findOne({ where: { boardNo } });

    // TODO: if(!board) throw new BadRequestException();
    // TODO: if(board.userId !== userId) throw new AccessDeniedException();

    // TODO: return board;
  }
}
