import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from '#comment/services/comment.service';
import { CommentListRequest } from '#comment/dtos/in/comment-list.request.dto';
import type { Request } from 'express';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { CommentListResponse } from '#comment/dtos/out/comment-list.response.dto';
import { PostCommentRequest } from '#comment/dtos/in/post-comment.request.dto';
import { getAuthId } from '#common/utils/auth.utils';
import { CommentPostReplyRequest } from '#comment/dtos/in/comment-post-reply.request.dto';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CustomApiCreatedResponse } from '#common/decorators/swagger/created.decorator';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { ApiNoContentVoid } from '#common/decorators/swagger/no-content-void.decorator';
import {
  PostCommentBadRequestExamples,
  PostCommentReplyBadRequestExamples,
} from '#comment/swagger/examples/comment-error.example';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { ApiCombinedResponse } from '#common/decorators/swagger/api-response.decorator';
import { COMMENT_TARGET } from '#comment/constants/comment-list-type.constants';

@ApiTags('comments')
@Controller('comment')
@ApiInternalServerErrorResponse({
  description: '서버 오류',
  example: {
    statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
    message: 'Internal server error'
  }
})
export class CommentController {
  constructor(
    private readonly commentService: CommentService
  ) {}

  @Get('/board')
  @HttpCode(200)
  @ApiOperation({ summary: '일반 게시글 댓글 목록 조회' })
  @ApiCombinedResponse(CommentListResponse, true)
  async getBoardCommentList(
    @Query() commentListDTO: CommentListRequest
  ): Promise<ListResponse<CommentListResponse>> {
    
    return this.commentService.getCommentListService(commentListDTO, COMMENT_TARGET.BOARD);
  }

  @Get('/image-board')
  @HttpCode(200)
  @ApiOperation({ summary: '이미지 게시글 댓글 목록 조회' })
  @ApiCombinedResponse(CommentListResponse, true)
  async getImageBoardCommentList(
    @Query() commentListDTO: CommentListRequest
  ): Promise<ListResponse<CommentListResponse>> {

    return this.commentService.getCommentListService(commentListDTO, COMMENT_TARGET.IMAGE);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/board/:targetBoardId')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '일반 게시글 댓글 작성' })
  @ApiParam({
    name: 'targetBoardId',
    required: true,
    description: '일반 게시글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '댓글 작성 완료',
    {}
  )
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostCommentBadRequestExamples
      }
    }
  })
  async postBoardComment(
    @Body() postDTO: PostCommentRequest,
    @Req() req: Request,
    @Param('targetBoardId', ParseIntPipe) targetBoardId: number
  ): Promise<void> {
    const userId: number = getAuthId(req);

    await this.commentService.postCommentService(postDTO, userId, { boardId: targetBoardId });
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/image-board/:targetBoardId')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '이미지 게시글 댓글 작성' })
  @ApiParam({
    name: 'targetBoardId',
    required: true,
    description: '이미지 게시글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '댓글 작성 완료',
    {}
  )
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostCommentBadRequestExamples
      }
    }
  })
  async postImageBoardComment(
    @Body() postDTO: PostCommentRequest,
    @Req() req: Request,
    @Param('targetBoardId', ParseIntPipe) targetBoardId: number
  ): Promise<void> {
    const userId: number = getAuthId(req);

    await this.commentService.postCommentService(postDTO, userId, { imageId: targetBoardId });
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:id')
  @HttpCode(204)
  @ApiBearerCookie()
  @ApiOperation({ summary: '댓글 삭제' })
  @ApiParam({
    name: 'commentNo',
    required: true,
    description: '댓글 번호',
    type: Number
  })
  @ApiNoContentVoid('삭제 완료')
  async deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request
  ): Promise<void> {
    const userId: number = getAuthId(req);

    await this.commentService.deleteCommentService(id, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/:id/reply')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '댓글 답변 작성' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '원본 댓글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '작성 완료',
    {}
  )
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostCommentReplyBadRequestExamples
      }
    }
  })
  async postCommentReply(
    @Body() postReplyDTO: CommentPostReplyRequest,
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    const userId: number = getAuthId(req);

    await this.commentService.postReplyService(postReplyDTO, id, userId);
  }

}
