import { Controller, Delete, Get, HttpCode, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '#common/decorators/roles.decorator';
import { RolesGuard } from '#common/guards/roles.guard';
import { BoardImagesUploadInterceptor } from '#common/interceptor/board-images-upload.interceptor';
import { ImageBoardService } from '#imageBoard/services/image-board.service';
import { LoggerService } from '#config/logger/logger.service';

@ApiTags('imageBoard')
@Controller('image-board')
export class ImageBoardController {

  constructor(
    private readonly imageboardService: ImageBoardService,
    private readonly logger: LoggerService
  ) {
  }

  /**
   * @Query{
   *   keyword?: string,
   *   searchType?: string,
   *   pageNum?: number = 1
   * } pageDTO: PaginationDTO
   *
   * @returns {
   *   data: {
   *     content: [
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
  async getList(): Promise<void>{}

  /**
   * @param imageNo: number
   *
   * @returns {
   *   data: {
   *     content: {
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
  async getDetail(): Promise<void>{}

  /**
   * @Body{
   *   imageTitle: string,
   *   imageContent: string,
   * }
   * @param{
   *   image: File (min 1, limit 5, mimetype: image/*)
   * }req
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
  async postImageBoard(): Promise<void>{}

  /**
   * @param imageNo: number
   *
   * @returns {
   *   data: {
   *     imageNo: number,
   *     imageTitle: string,
   *     imageContent: string,
   *     imageData: string[{ imageName: string }]
   *   }
   * }
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Get('/patch-detail/:imageNo')
  @HttpCode(200)
  async getPatchDetailData(): Promise<void> {}

  /**
   * @Body{
   *   imageTitle: string,
   *   imageContent: string,
   *   deleteFiles?: string[{imageName}]
   * }
   *
   * @param{
   *   file?: File ( limit: 5, mimetype: image/*)
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
  async patchImageBoard(): Promise<void> {}

  /**
   * @param imageNo: number
   */
  @Roles('ROLE_MEMBER')
  @UseGuards(RolesGuard)
  @Delete('/:imageNo')
  @HttpCode(204)
  async deleteImageBoard(): Promise<void>{}
}
