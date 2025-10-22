import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param, ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody, ApiForbiddenResponse,
  ApiInternalServerErrorResponse, ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { BoardImagesUploadInterceptor } from '#common/interceptor/board-images-upload.interceptor';
import { ImageBoardService } from '#imageBoard/services/image-board.service';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { ImageBoardListResponseDTO } from '#imageBoard/dtos/out/image-board-list-response.dto';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';
import { UserStatusDTOMapper } from '#common/mapper/user-status.mapper';
import type { Request } from 'express';
import { createListResponseDTO } from '#common/dtos/out/list-response.dto';
import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';
import { createDetailResponseDTO } from '#common/dtos/out/detail-response.dto';
import { PostImageBoardDTO } from '#imageBoard/dtos/in/post-image-board.dto';
import { getAuthUserId } from '#common/utils/auth.utils';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { CustomApiCreatedResponse } from '#common/decorators/swagger/created.decorator';
import { ImageBoardPatchDataResponseDTO } from '#imageBoard/dtos/out/image-board-patch-data-response.dto';
import { PatchImageBoardDTO } from '#imageBoard/dtos/in/patch-image-board.dto';
import { ApiNoContentVoid } from '#common/decorators/swagger/no-content-void.decorator';
import { ApiImageBoardExtraModels } from '#imageBoard/swagger/decorator/image-board-extra-models.decorator';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { ApiAuthExceptionResponse } from '#common/decorators/swagger/api-auth-exception-response.decorator';
import {
  PatchImageBoardBadRequestExamples,
  PostImageBoardBadRequestExamples,
} from '#imageBoard/swagger/example/image-board-error.example';

const ListResponseDTO = createListResponseDTO(ImageBoardListResponseDTO, 'imageBoard');
const DetailResponseDTO = createDetailResponseDTO(ImageBoardDetailResponseDTO, 'imageBoardDetail');
const PatchDetailResponseDTO = createDetailResponseDTO(ImageBoardPatchDataResponseDTO, 'imageBoardPatchDetail');

@ApiTags('imageBoard')
@ApiImageBoardExtraModels(
  ListResponseDTO,
  DetailResponseDTO,
  PatchDetailResponseDTO
)
@Controller('image-board')
@ApiAuthExceptionResponse()
@ApiInternalServerErrorResponse({
  description: '서버 오류',
  example: {
    statusCode: ResponseStatusConstants.INTERNAL_SERVER_ERROR.CODE,
    message: 'Internal server error'
  }
})
export class ImageBoardController {

  constructor(
    private readonly imageboardService: ImageBoardService,
  ) { }

  /**
   * @param pageDTO {
   *   keyword?: string,
   *   searchType?: string,
   *   pageNum?: number = 1
   * } query
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   data: ListResponseDTO<T>{
   *     content: ImageBoardListResponseDTO [
   *       {
   *         imageNo: number,
   *         imageTitle: string,
   *         userId: string,
   *         imageDate: Date,
   *         imageName: string
   *       }
   *     ],
   *     empty: boolean,
   *     totalElements: number,
   *     userStauts: UserStatusDTO {
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
    description: '정상 조회',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ListResponseDTO) },
      ]
    }
  })
  async getList(
    @Query() pageDTO: PaginationDTO,
    @Req() req: Request
  ): Promise<InstanceType<typeof ListResponseDTO>>{
    const boardList: {
      list: ImageBoardListResponseDTO[],
      totalElements: number
    } = await this.imageboardService.getImageBoardListService(pageDTO);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new ListResponseDTO(boardList.list, boardList.totalElements, userStatus);
  }

  /**
   * @param imageNo
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   data: DetailResponseDTO<T> {
   *     content: ImageBoardDetailResponseDTO {
   *       imageNo: number,
   *       imageTitle: string,
   *       imageContent: string,
   *       userId: string,
   *       imageDate: Date,
   *       imageData: [
   *         {
   *           imageName: string,
   *           oldName: string,
   *           imageStep: number
   *         }
   *       ]
   *     },
   *     userStatus: UserStatusDTO {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Get('/:imageNo')
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({
    name: 'imageNo',
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
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE
    }
  })
  async getDetail(
    @Param('imageNo', ParseIntPipe) imageNo: number,
    @Req() req: Request
  ): Promise<InstanceType<typeof DetailResponseDTO>>{
    const boardDetail: ImageBoardDetailResponseDTO = await this.imageboardService.getImageBoardDetailService(imageNo);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByReq(req);

    return new DetailResponseDTO(boardDetail, userStatus);
  }

  /**
   * @param postDTO {
   *   imageTitle: string,
   *   imageContent: string,
   * } body
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   },
   *   files: File [
   *     {
   *       filename: string,
   *       originalname: string,
   *       ...
   *     }
   *   ] ( min 1, limit 5, mimetype: image/* )
   * }
   *
   * @returns {
   *   data: {
   *     imageNo: number
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/')
  @UseInterceptors(BoardImagesUploadInterceptor)
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 작성' })
  @ApiBody({ type: PostImageBoardDTO })
  @CustomApiCreatedResponse(
    '게시글 작성 완료',
    {
      imageNo: 1
    }
  )
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostImageBoardBadRequestExamples
      }
    }
  })
  async postImageBoard(
    @Body()postDTO: PostImageBoardDTO,
    @Req() req: Request
  ): Promise<{ imageNo: number }>{
    return await this.imageboardService.postImageBoardService(postDTO, req);
  }

  /**
   * @param imageNo
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns {
   *   data: DetailResponseDTO<T> {
   *     content: ImageBoardPatchDataResponseDTO {
   *       imageNo: number,
   *       imageTitle: string,
   *       imageContent: string,
   *       imageData: String[{ imageName: string }]
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
  @Get('/patch-detail/:imageNo')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정 데이터 조회' })
  @ApiParam({
    name: 'imageNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiOkResponse({
    description: '정상 조회',
    schema: {
      $ref: getSchemaPath(PatchDetailResponseDTO)
    }
  })
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE
    }
  })
  @ApiForbiddenResponse({
    description: '작성자 불일치',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE
    }
  })
  async getPatchDetailData(
    @Param('imageNo', ParseIntPipe) imageNo: number,
    @Req() req: Request
  ): Promise<InstanceType<typeof PatchDetailResponseDTO>> {
    const userId: string = getAuthUserId(req);
    const patchDetail: ImageBoardPatchDataResponseDTO = await this.imageboardService.getPatchDataService(imageNo, userId);
    const userStatus: UserStatusDTO = UserStatusDTOMapper.createUserStatusByUserId(userId);

    return new PatchDetailResponseDTO(patchDetail, userStatus);
  }

  /**
   *
   * @param imageNo
   * @param patchDTO {
   *   imageTitle: string,
   *   imageContent: string,
   *   deleteFiles?: string[{imageName}]
   * } body
   *
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   },
   *   files: File [
   *     {
   *       filename: string,
   *       originalname: string,
   *       ...
   *     }
   *   ] ( min 1, limit 5, mimetype: image/* )
   * }
   *
   * @returns {
   *   data: {
   *     imageNo: number
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Patch('/:imageNo')
  @UseInterceptors(BoardImagesUploadInterceptor)
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiParam({
    name: 'imageNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiBody({ type: PatchImageBoardDTO })
  @ApiOkResponse({
    description: '게시글 수정 완료',
    schema: {
      example: { boardNo: 1 }
    }
  })
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE
    }
  })
  @ApiForbiddenResponse({
    description: '작성자 불일치',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE
    }
  })
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PatchImageBoardBadRequestExamples
      }
    }
  })
  async patchImageBoard(
    @Param('imageNo', ParseIntPipe) imageNo: number,
    @Body() patchDTO: PatchImageBoardDTO,
    @Req() req: Request
  ): Promise<{ imageNo: number }> {
    return await this.imageboardService.patchImageBoardService(imageNo, patchDTO, req);
  }

  /**
   * @param imageNo
   * @param req {
   *   user?: {
   *     userId: string,
   *     roles: string[]
   *   }
   * }
   *
   * @returns{
   *   status: 204
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:imageNo')
  @HttpCode(204)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiParam({
    name: 'imageNo',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiNoContentVoid('삭제 완료')
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE
    }
  })
  @ApiForbiddenResponse({
    description: '작성자 불일치',
    example: {
      statusCode: ResponseStatusConstants.ACCESS_DENIED.CODE,
      message: ResponseStatusConstants.ACCESS_DENIED.MESSAGE
    }
  })
  async deleteImageBoard(
    @Param('imageNo', ParseIntPipe) imageNo: number,
    @Req() req: Request
  ): Promise<void>{
    const userId: string = getAuthUserId(req);

    await this.imageboardService.deleteImageBoard(imageNo, userId);
  }
}
