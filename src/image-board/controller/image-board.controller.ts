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
  Req, UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody, ApiForbiddenResponse,
  ApiInternalServerErrorResponse, ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { BoardImagesUploadInterceptor } from '#common/interceptor/board-images-upload.interceptor';
import { ImageBoardService } from '#imageBoard/services/image-board.service';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { ImageBoardListResponse } from '#imageBoard/dtos/out/image-board-list.response.dto';
import type { Request } from 'express';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { PostImageBoardRequest } from '#imageBoard/dtos/in/post-image-board.request.dto';
import { getAuthId, getAuthUserId } from '#common/utils/auth.utils';
import { ApiBearerCookie } from '#common/decorators/swagger/api-bearer-cookie.decorator';
import { ImageBoardPatchDetailResponse } from '#imageBoard/dtos/out/image-board-patch-detail.response.dto';
import { PatchImageBoardRequest } from '#imageBoard/dtos/in/patch-image-board.request.dto';
import { ApiNoContentVoid } from '#common/decorators/swagger/no-content-void.decorator';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { ApiAuthExceptionResponse } from '#common/decorators/swagger/api-auth-exception-response.decorator';
import {
  PatchImageBoardBadRequestExamples,
  PostImageBoardBadRequestExamples,
} from '#imageBoard/swagger/example/image-board-error.example';
import { ApiCombinedResponse } from '#common/decorators/swagger/api-response.decorator';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { ApiPrimitiveResponse } from '#common/decorators/swagger/api-primitive-response.decorator';
import { FILE_TYPE } from '#common/constants/common-file-type.constants';
import { FileService } from '#src/file/service/file.service';
import { ImageRenderInterceptor } from '#common/interceptor/image-render.interceptor';
import { SkipTransform } from '#common/decorators/file/skip-transform.decorator';


@ApiTags('imageBoard')
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
    private readonly fileService: FileService
  ) { }

  @Get('/')
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiCombinedResponse(ImageBoardListResponse, true)
  async getList(
    @Query() pageDTO: PaginationDTO
  ): Promise<ListResponse<ImageBoardListResponse>>{

    return this.imageboardService.getListService(pageDTO);
  }

  @Get('/:id')
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiCombinedResponse(ImageBoardDetailResponse)
  @ApiNotFoundResponse({
    description: '데이터 없음',
    example: {
      statusCode: ResponseStatusConstants.NOT_FOUND.CODE,
      message: ResponseStatusConstants.NOT_FOUND.MESSAGE
    }
  })
  async getDetail(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ImageBoardDetailResponse>{
    return await this.imageboardService.getDetailService(id);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Post('/')
  @UseInterceptors(BoardImagesUploadInterceptor)
  @HttpCode(201)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 작성' })
  @ApiBody({ type: PostImageBoardRequest })
  @ApiPrimitiveResponse('number', 201)
  @ApiBadRequestResponse({
    description: '요청 데이터 오류',
    content: {
      'application/json': {
        examples: PostImageBoardBadRequestExamples
      }
    }
  })
  async postImageBoard(
    @Body() postDTO: PostImageBoardRequest,
    @Req() req: Request
  ): Promise<number>{
    const userId: number = getAuthId(req);
    const files = req.files as Express.Multer.File[];

    return await this.imageboardService.postBoardService(postDTO, files, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/patch/detail/:id')
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정 데이터 조회' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiCombinedResponse(ImageBoardPatchDetailResponse)
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
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request
  ): Promise<ImageBoardPatchDetailResponse> {
    const userId: string = getAuthUserId(req);

    return await this.imageboardService.getPatchDataService(id, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Patch('/:id')
  @UseInterceptors(BoardImagesUploadInterceptor)
  @HttpCode(200)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiParam({
    name: 'id',
    required: true,
    description: '게시글 번호',
    type: Number
  })
  @ApiBody({ type: PatchImageBoardRequest })
  @ApiPrimitiveResponse('number', 200)
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
    @Param('id', ParseIntPipe) id: number,
    @Body() patchDTO: PatchImageBoardRequest,
    @Req() req: Request
  ): Promise<number> {
    const userId: number = getAuthId(req);
    const files = req.files as Express.Multer.File[];

    return await this.imageboardService.patchImageBoardService(id, patchDTO, files, userId);
  }

  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:id')
  @HttpCode(204)
  @ApiBearerCookie()
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiParam({
    name: 'id',
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
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request
  ): Promise<void>{
    const userId: number = getAuthId(req);

    await this.imageboardService.deleteImageBoard(id, userId);
  }

  @Get('/display/:imageName')
  @SkipTransform()
  @UseInterceptors(ImageRenderInterceptor)
  async getDisplayImage(
    @Param('imageName') imageName: string
  ) {

    return await this.fileService.displayService(imageName, FILE_TYPE.IMAGE_BOARD);
  }
}
