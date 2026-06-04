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
import { PostBoardRequest } from '#board/dtos/in/post-board.request.dto';
import {
  ApiBadRequestResponse,
  ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse,
  ApiOkResponse, ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { BoardDetailResponse } from '#board/dtos/out/board-detail.response.dto';
import { ApiNoContentVoid } from '#common/decorators/swagger/no-content-void.decorator';
import { BoardListResponse } from '#board/dtos/out/board-list.response.dto';
import { BoardPatchDetailResponse } from '#board/dtos/out/board-patch-detail.response.dto';
import { PostReplyRequest } from '#board/dtos/in/post-reply.request.dto';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { getAuthId } from '#common/utils/auth.utils';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { ApiAuthExceptionResponse } from '#common/decorators/swagger/api-auth-exception-response.decorator';
import {
  PostBoardBadRequestExamples,
  PostBoardReplyBadRequestExamples,
} from '#board/swagger/examples/board-error.example';
import { ApiCombinedResponse } from '#common/decorators/swagger/api-response.decorator';
import { ApiPrimitiveResponse } from '#common/decorators/swagger/api-primitive-response.decorator';

@ApiTags('Boards')
@Controller('board')
@ApiAuthExceptionResponse()
@ApiInternalServerErrorResponse({
  description: '서버 오류',
  example: {
    statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
    message: 'Internal server error',
  },
})
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get('/')
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiCombinedResponse(BoardListResponse, true)
  async getList(
    @Query() pageDTO: PaginationDTO,
  ): Promise<ListResponse<BoardListResponse>> {
    return await this.boardService.getListService(pageDTO);
  }


  @Get('/:id')
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number,
  })
  @ApiCombinedResponse(BoardDetailResponse)
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE,
    },
  })
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BoardDetailResponse> {
    return await this.boardService.getDetailService(id);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 작성' })
  @ApiBody({ type: PostBoardRequest })
  @ApiPrimitiveResponse('number', 201)
  @ApiAuthExceptionResponse()
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostBoardBadRequestExamples,
      },
    },
  })
  async postBoard(
    @Body() postBoardDTO: PostBoardRequest,
    @Req() req: Request,
  ): Promise<number> {
    const userId: number = getAuthId(req);

    return await this.boardService.postBoardService(postBoardDTO, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/patch-detail/:id')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정 데이터 조회' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number,
  })
  @ApiCombinedResponse(BoardPatchDetailResponse)
  @ApiAuthExceptionResponse()
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE,
    },
  })
  @ApiForbiddenResponse({
    description: '작성자 불일치',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE,
    },
  })
  async getPatchDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<BoardPatchDetailResponse> {
    const userId: number = getAuthId(req);

    return await this.boardService.getBoardPatchDataService(id, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Patch('/:id')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number,
  })
  @ApiBody({ type: PostBoardRequest })
  @ApiPrimitiveResponse('number', 200)
  @ApiAuthExceptionResponse()
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE,
    },
  })
  @ApiForbiddenResponse({
    description: '작성자 불일치',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE,
    },
  })
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostBoardBadRequestExamples,
      },
    },
  })
  async patchBoard(
    @Param('id', ParseIntPipe) boardNo: number,
    @Body() patchBoardDTO: PostBoardRequest,
    @Req() req: Request,
  ): Promise<number> {
    const userId: number = getAuthId(req);

    return await this.boardService.patchBoardService(
      boardNo,
      patchBoardDTO,
      userId,
    );
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:id')
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 삭제' })
  @HttpCode(204)
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number,
  })
  @ApiNoContentVoid('삭제 완료')
  @ApiAuthExceptionResponse()
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE,
    },
  })
  @ApiForbiddenResponse({
    description: '작성자 불일치',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE,
    },
  })
  async deleteBoard(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    const userId: number = getAuthId(req);

    await this.boardService.deleteBoardService(id, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/reply/:id')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 답변 작성을 위한 원본글 데이터 조회' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number,
  })
  @ApiOkResponse({
    description: '정상 조회'
  })
  @ApiAuthExceptionResponse()
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE,
    },
  })
  async getReplyData(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
      await this.boardService.getReplyDataService(id);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/reply/:targetId')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 답변 작성' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '원본 게시글 번호',
    type: Number,
  })
  @ApiBody({ type: PostReplyRequest })
  @ApiPrimitiveResponse('number', 201)
  @ApiAuthExceptionResponse()
  @ApiNotFoundResponse({
    description: '상위 데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE,
    },
  })
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostBoardReplyBadRequestExamples,
      },
    },
  })
  async postReply(
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body() replyDTO: PostReplyRequest,
    @Req() req: Request,
  ): Promise<number> {
    const userId: number = getAuthId(req);

    return await this.boardService.postBoardReplyService(replyDTO, targetId, userId);
  }
}
