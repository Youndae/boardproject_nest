import {
  Controller,
  HttpCode,
  Body,
  Param,
  Query,
  Req,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards
} from '@nestjs/common';
import { BoardService } from '#board/services/board.service';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import type { Request } from 'express';

@Controller('board')
export class BoardController {

  constructor(
    private readonly boardService: BoardService
  ) { }


  /**
   *
   * @Query {
   *  keyword?: string,
   *  searchType?: string,
   *  pageNum?: number = 1
   * }
   *
   *
   * @returns {
   *   status: 200,
   *   data: BoardListResponseDTO<T> {
   *     content: BoardListResponseDTO[] [
   *       {
   *         boardNo: number,
   *         boardTitle: string,
   *         userId: string,
   *         boardDate: Date,
   *         boardIndent: number
   *       }
   *     ],
   *     empty: boolean,
   *     totalElements: number,
   *     userStatus: UserStatusDTO {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Get('/')
  @HttpCode(200)
  getList(
    @Query('keyword') keyword?: string,
    @Query('searchType') searchType?: string,
    @Query('pageNum') pageNum?: number
  ): void {

  }

  /**
   * @param boardNo
   *
   * @returns {
   *   status: 200,
   *   data: BoardResponseDTO<T> {
   *     content: BoardDetailDTO {
   *       boardNo: number,
   *       boardTitle: string,
   *       boardContent: string,
   *       userId: string,
   *       boardDate: Date
   *     },
   *     userStatus: UserStatusDTO {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Get('/:boardNo/:type')
  @HttpCode(200)
  getDetail(@Param('boardNo') boardNo: number): void {

  }

  /**
   * @Body {
   *   boardTitle: string,
   *   boardContent: string
   * } postBoardDTO
   *
   * @Param {
   *   user: {
   *     userId: string,
   *     roles: string[],
   *   }
   * } req
   *
   * @returns {
   *   status 201,
   *   data: {
   *     boardNo: number
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/')
  @HttpCode(201)
  postBoard(@Body() postBoardDTO: any, @Req() req: Request): void {

  }

  /**
   * @param boardNo
   *
   * @param {
   *   user: {
   *     userId: string,
   *     roles: string[]
   *   }
   * } req
   *
   * @returns {
   *   status: 200,
   *   data: BoardResponseDTO<T> {
   *     content: patchBoardResponseDTO {
   *       boardNo: number,
   *       boardTitle: string,
   *       boardContent: string
   *     },
   *     userStatus: UserStatusDTO {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/patch-detail/:boardNo')
  @HttpCode(200)
  getPatchDetail(@Param('boardNo') boardNo: number, @Req() req: Request): void {

  }

  /**
   *
   * @param boardNo
   * @Body {
   *   boardTitle: string,
   *   boardContent: string
   * } patchBoardDTO
   * @param {
   *   user: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }req
   *
   * @returns {
   *   status: 200,
   *   data: {
   *     boardNo: number
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Patch('/:boardNo')
  @HttpCode(200)
  patchBoard(
    @Param('boardNo') boardNo: number,
    @Body() patchBoardDTO: any,
    @Req() req: Request
  ): void {

  }

  /**
   *
   * @param boardNo
   * @param {
   *   user: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }req
   *
   * @returns {
   *   status: 204
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:boardNo')
  @HttpCode(204)
  deleteBoard(@Param('boardNo') boardNo: number, @Req() req: Request): void {

  }

  /**
   *
   * @param boardNo
   * @param {
   *   user: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }req
   *
   * @returns {
   *   status: 200,
   *   data: BoardResponseDTO<T> {
   *     content: BoardReplyResponseDTO {
   *       boardGroupNo: number,
   *       boardUpperNo: string,
   *       boardIndent: number
   *     },
   *     userStatus: UserStatusDTO {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/reply/:boardNo')
  @HttpCode(200)
  getReplyData(@Param('boardNo') boardNo: number, @Req() req: Request): void {

  }

  /**
   *
   * @Body {
   *   boardTitle: string,
   *   boardContent: string,
   *   boardGroupNo: number,
   *   boardUpperNo: string,
   *   boardIndent: number
   * } replyDTO: ReplyBoardPostDTO
   *
   * @param {
   *   user: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }req
   *
   * @returns {
   *   status: 201,
   *   data: {
   *     boardNo: number
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/reply')
  @HttpCode(201)
  postReply(@Body() replyDTO: any, @Req() req: Request): void {

  }
}
