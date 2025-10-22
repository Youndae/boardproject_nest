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
import { CommentListRequestDTO } from '#comment/dtos/in/comment-list-request.dto';
import type { Request } from 'express';
import { createListResponseDTO } from '#common/dtos/out/list-response.dto';
import { CommentListResponseDTO } from '#comment/dtos/out/comment-list-response.dto';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';
import { UserStatusDTOMapper } from '#common/mapper/user-status.mapper';
import { CommentPostRequestDTO } from '#comment/dtos/in/comment-post-request.dto';
import { getAuthUserId } from '#common/utils/auth.utils';
import { CommentPostReplyRequestDTO } from '#comment/dtos/in/comment-post-reply-request.dto';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CustomApiCreatedResponse } from '#common/decorators/swagger/created.decorator';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { ApiNoContentVoid } from '#common/decorators/swagger/no-content-void.decorator';

const ListResponseDTO = createListResponseDTO(CommentListResponseDTO, 'comment');

@ApiTags('comments')
@ApiExtraModels(
  ListResponseDTO,
  CommentListResponseDTO,
  UserStatusDTO
)
@Controller('comment')
export class CommentController {
  constructor(
    private readonly commentService: CommentService
  ) {}

  /**
   * @param commentListDTO {
   *   boardNo?: number,
   *   imageNo?: number,
   *   pageNum?: number
   * } query
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   status: 200,
   *   data: {
   *     content: CommentListResponseDTO [
   *       {
   *         commentNo: number,
   *         userId: string,
   *         commentDate: Date,
   *         commentContent: string,
   *         commentGroupNo: number,
   *         commentIndent: number,
   *         commentUpperNo: string
   *       },
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
  @Get('/board')
  @HttpCode(200)
  @ApiOperation({ summary: '일반 게시글 댓글 목록 조회' })
  @ApiOkResponse({
    description: '정상 조회',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ListResponseDTO) }
      ]
    }
  })
  async getBoardCommentList(
    @Query() commentListDTO: CommentListRequestDTO,
    @Req() req: Request
  ): Promise<InstanceType<typeof ListResponseDTO>> {
    const commentList: {
      list: CommentListResponseDTO[],
      totalElements: number
    } = await this.commentService.getCommentListService(commentListDTO);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new ListResponseDTO(commentList.list, commentList.totalElements, userStatus);
  }

  /**
   * @param commentListDTO {
   *   boardNo?: number,
   *   imageNo?: number,
   *   pageNum?: number
   * } query
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   status: 200,
   *   data: {
   *     content: CommentListResponseDTO [
   *       {
   *         commentNo: number,
   *         userId: string,
   *         commentDate: Date,
   *         commentContent: string,
   *         commentGroupNo: number,
   *         commentIndent: number,
   *         commentUpperNo: string
   *       },
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
  @Get('/image')
  @HttpCode(200)
  @ApiOperation({ summary: '이미지 게시글 댓글 목록 조회' })
  @ApiOkResponse({
    description: '정상 조회',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ListResponseDTO) }
      ]
    }
  })
  async getImageBoardCommentList(
    @Query() commentListDTO: CommentListRequestDTO,
    @Req() req: Request
  ): Promise<InstanceType<typeof ListResponseDTO>> {
    const commentList: {
      list: CommentListResponseDTO[],
      totalElements: number
    } = await this.commentService.getCommentListService(commentListDTO);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new ListResponseDTO(commentList.list, commentList.totalElements, userStatus);
  }

  /**
   *
   * @param postDTO { commentContent: string } body
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   * @param boardNo
   *
   * @returns {
   *   status 201
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/board/:boardNo')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '일반 게시글 댓글 작성' })
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '일반 게시글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '댓글 작성 완료',
    {}
  )
  async postBoardComment(
    @Body() postDTO: CommentPostRequestDTO,
    @Req() req: Request,
    @Param('boardNo', ParseIntPipe) boardNo: number
  ): Promise<void> {
    const userId: string = getAuthUserId(req);

    await this.commentService.postCommentService(postDTO, userId, { boardNo });
  }

  /**
   * @param postDTO {
   *   commentContent: string
   * } body
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   * @param imageNo
   *
   * @returns {
   *   status 201
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/image/:imageNo')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '이미지 게시글 댓글 작성' })
  @ApiParam({
    name: 'imageNo',
    required: true,
    description: '이미지 게시글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '댓글 작성 완료',
    {}
  )
  async postImageBoardComment(
    @Body() postDTO: CommentPostRequestDTO,
    @Req() req: Request,
    @Param('imageNo', ParseIntPipe) imageNo: number
  ): Promise<void> {
    const userId: string = getAuthUserId(req);

    await this.commentService.postCommentService(postDTO, userId, { imageNo });
  }

  /**
   * @param commentNo
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   status: 204
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:commentNo')
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
    @Param('commentNo', ParseIntPipe) commentNo: number,
    @Req() req: Request
  ): Promise<void> {
    const userId: string = getAuthUserId(req);

    await this.commentService.deleteCommentService(commentNo, userId);
  }

  /**
   * @param postReplyDTO {
   *   commentContent: string,
   *   commentGroupNo: number,
   *   commentIndent: number,
   *   commentUpperNo: string
   * } body
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   * @param boardNo
   *
   * @returns {
   *   status: 201
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/board/:boardNo/reply')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '일반 게시글 댓글 답변 작성' })
  @ApiParam({
    name: 'boardNo',
    required: true,
    description: '일반 게시글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '작성 완료',
    {}
  )
  async postReplyBoardComment(
    @Body() postReplyDTO: CommentPostReplyRequestDTO,
    @Req() req: Request,
    @Param('boardNo', ParseIntPipe) boardNo: number
  ): Promise<void> {
    const userId: string = getAuthUserId(req);

    await this.commentService.postReplyService(postReplyDTO, userId, { boardNo });
  }

  /**
   * @param postReplyDTO {
   *   commentContent: string,
   *   commentGroupNo: number,
   *   commentIndent: number,
   *   commentUpperNo: string
   * } body
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   * @param imageNo
   *
   * @returns {
   *   status: 201
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/image/:imageNo/reply')
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '이미지 게시글 댓글 답변 작성' })
  @ApiParam({
    name: 'imageNo',
    required: true,
    description: '이미지 게시글 번호',
    type: Number
  })
  @CustomApiCreatedResponse(
    '작성 완료',
    {}
  )
  async postReplyImageBoardComment(
    @Body() postReplyDTO: CommentPostReplyRequestDTO,
    @Req() req: Request,
    @Param('imageNo', ParseIntPipe) imageNo: number
  ): Promise<void> {
    const userId: string = getAuthUserId(req);

    await this.commentService.postReplyService(postReplyDTO, userId, { imageNo });
  }
}
