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
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { BoardService } from '#board/services/board.service';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import type { Request } from 'express';
import { PostBoardDto } from '#board/dtos/in/post-board.dto';
import {
  ApiBody,
  ApiOkResponse, ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { createListResponseDTO } from '#common/dtos/out/list-response.dto';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';
import { createDetailResponseDTO } from '#common/dtos/out/detail-response.dto';
import { BoardDetailResponseDTO } from '#board/dtos/out/board-detail-response.dto';
import { ApiNoContentVoid } from '#common/decorators/swagger/no-content-void.decorator';
import { CustomApiCreatedResponse } from '#common/decorators/swagger/created.decorator';
import { ApiBoardExtraModels } from '#board/swagger/decorator/board-extra-models.decorator';
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { BoardPatchDetailResponseDTO } from '#board/dtos/out/board-patch-detail-response.dto';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';
import { PostReplyDTO } from '#board/dtos/in/post-reply.dto';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { UserStatusDTOMapper } from '#common/mapper/user-status.mapper';
import { getAuthUserId } from '#common/utils/auth.utils';

const ListResponseDTO = createListResponseDTO(BoardListResponseDTO, 'board');
const DetailResponseDTO = createDetailResponseDTO(BoardDetailResponseDTO, 'boardDetail');
const PatchDetailResponseDTO = createDetailResponseDTO(BoardPatchDetailResponseDTO,'patchDetail');
const ReplyDataResponseDTO = createDetailResponseDTO(BoardReplyDataDTO, 'replyData');

@ApiTags('Boards')
@ApiBoardExtraModels(
  ListResponseDTO,
  DetailResponseDTO,
  PatchDetailResponseDTO,
  ReplyDataResponseDTO
)
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
  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiOkResponse({
    description: '정상 처리',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ListResponseDTO) },
      ],
    },
  })
  async getList(
    @Query() pageDTO: PaginationDTO,
    @Req() req: Request
  ): Promise<InstanceType<typeof ListResponseDTO>> {
    const boardList: { list: BoardListResponseDTO[], totalElements: number } = await this.boardService.getListService(pageDTO);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new ListResponseDTO(boardList.list, boardList.totalElements, userStatus);
  }

  /**
   * @param boardNo
   * @param req
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
  @Get('/:boardNo')
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiOkResponse({
    description: '정상 조회',
    schema: {
      $ref: getSchemaPath(DetailResponseDTO)
    },
  })
  async getDetail(@Param('boardNo', ParseIntPipe) boardNo: number, @Req() req: Request): Promise<InstanceType<typeof DetailResponseDTO>> {
    const boardDetail: BoardDetailResponseDTO = await this.boardService.getDetailService(boardNo);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new DetailResponseDTO(boardDetail, userStatus);
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
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 작성' })
  @ApiBody({ type: PostBoardDto })
  @CustomApiCreatedResponse(
    '게시글 작성 완료',
    {
      boardNo: 1
    }
  )
  async postBoard(@Body() postBoardDTO: PostBoardDto, @Req() req: Request): Promise<{ boardNo: number }> {
    const userId: string = getAuthUserId(req);

    return await this.boardService.postBoardService(postBoardDTO, userId);
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
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정 데이터 조회' })
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiOkResponse({
    description: '정상 조회',
    schema: { $ref: getSchemaPath(PatchDetailResponseDTO) }
  })
  async getPatchDetail(@Param('boardNo') boardNo: number, @Req() req: Request): Promise<InstanceType<typeof PatchDetailResponseDTO>> {
    const userId: string = getAuthUserId(req);
    const patchDetail: BoardPatchDetailResponseDTO = await this.boardService.getBoardPatchDataService(boardNo, userId);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByUserId(userId);

    return new PatchDetailResponseDTO(patchDetail, userStatus);
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
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiBody({ type: PostBoardDto })
  @ApiOkResponse({
    description: '게시글 수정 완료',
    schema: {
      example: { boardNo: 1 }
    }
  })
  async patchBoard(
    @Param('boardNo') boardNo: number,
    @Body() patchBoardDTO: PostBoardDto,
    @Req() req: Request
  ): Promise<{ boardNo: number }> {
    const userId: string = getAuthUserId(req);

    return await this.boardService.patchBoardService(boardNo, patchBoardDTO, userId);
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
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 삭제' })
  @HttpCode(204)
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiNoContentVoid('삭제 완료')
  async deleteBoard(@Param('boardNo') boardNo: number, @Req() req: Request): Promise<void> {
    const userId: string = getAuthUserId(req);

    await this.boardService.deleteBoardService(boardNo, userId);
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
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 답변 작성을 위한 원본글 데이터 조회' })
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiOkResponse({
    description: '정상 조회',
    schema: {
      $ref: getSchemaPath(ReplyDataResponseDTO)
    }
  })
  async getReplyData(@Param('boardNo') boardNo: number, @Req() req: Request): Promise<InstanceType<typeof ReplyDataResponseDTO>> {
    const replyData: BoardReplyDataDTO = await this.boardService.getReplyDataService(boardNo);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new ReplyDataResponseDTO(replyData, userStatus);
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
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 답변 작성' })
  @ApiBody({ type: PostReplyDTO })
  @CustomApiCreatedResponse(
    '답변 작성 완료',
    {
      boardNo: 1
    }
  )
  async postReply(@Body() replyDTO: PostReplyDTO, @Req() req: Request): Promise<{ boardNo: number }> {
    const userId: string = getAuthUserId(req);

    return await this.boardService.postBoardReplyService(replyDTO, userId);
  }
}
