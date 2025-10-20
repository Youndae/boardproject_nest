import { Injectable } from '@nestjs/common';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#common/services/resizing.service';
import { FileService } from '#common/services/file.service';
import { LoggerService } from '#config/logger/logger.service';
import { Transactional } from 'typeorm-transactional';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ImageBoardListResponseDTO } from '#imageBoard/dtos/out/image-board-list-response.dto';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';
import { NotFoundException } from '#common/exceptions/not-found.exception';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { ImageBoardMapper } from '#imageBoard/mapper/image-board.mapper';
import { ImageBoardPatchDataResponseDTO } from '#imageBoard/dtos/out/image-board-patch-data-response.dto';
import type { Request } from 'express';
import { PostImageBoardDTO } from '#imageBoard/dtos/in/post-image-board.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { getAuthUserId } from '#common/utils/auth.utils';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { ImageDataMapper } from '#imageBoard/mapper/image-data.mapper';
import { PatchImageBoardDTO } from '#imageBoard/dtos/in/patch-image-board.dto';
import { TooManyFilesException } from '#common/exceptions/too-many-files.exception';
import { In } from 'typeorm';

@Injectable()
export class ImageBoardService {
  constructor(
    private readonly imageBoardRepository: ImageBoardRepository,
    private readonly imageDataRepository: ImageDataRepository,
    private readonly configService: ConfigService,
    private readonly resizing: ResizingService,
    private readonly fileService: FileService,
    private readonly logger: LoggerService
  ) {}

  /**
   * @param{
   *   keyword?: string,
   *   searchType?: string,
   *   pageNum: number = 1
   * } pageDTO
   *
   * @returns {
   *   list: ImageBoardListResponseDTO [
   *     {
   *       imageNo: number,
   *       imageTitle: string,
   *       userId: string,
   *       imageDate: Date,
   *       imageName: string
   *     }
   *   ],
   *   totalElements: number
   * }
   */
  async getImageBoardListService(pageDTO: PaginationDTO): Promise<{
    list: ImageBoardListResponseDTO[],
    totalElements: number,
  }> {
    const listAndTotalElements: {
      list: ImageBoardListResponseDTO[],
      totalElements: number;
    } = await this.imageBoardRepository.getImageBoardList(pageDTO);

    return listAndTotalElements;
  }

  /**
   * @param imageNo
   *
   * @returns {
   *   imageNo: number,
   *   imageTitle: string,
   *   imageContent: string,
   *   userId: string,
   *   imageDate: Date,
   *   imageData: [
   *     {
   *       imageName: string,
   *       oldName: string,
   *       imageStep: number
   *     }
   *   ]
   * }: ImageBoardDetailResponseDTO
   *
   * Not found
   * @exception 404 NOT_FOUND
   */
  async getImageBoardDetailService(imageNo: number): Promise<ImageBoardDetailResponseDTO> {
    const boardDetail: ImageBoardDetailResponseDTO | null = await this.imageBoardRepository.getImageBoardDetail(imageNo);

    if(!boardDetail)
      throw new NotFoundException();

    return boardDetail;
  }

  /**
   * @param{
   *   imageTitle: string,
   *   imageContent: string
   * } postDTO
   * @param req
   *
   * @return { imageNo: number }
   */
  @Transactional()
  async postImageBoardService(postDTO: PostImageBoardDTO, req: Request): Promise<{ imageNo: number }> {
    const userId: string = getAuthUserId(req);
    const files = req.files as Express.Multer.File[];
    if(!files || files.length < 1){
      this.logger.error('postImageBoard file is undefined. userId : ', userId);
      throw new BadRequestException();
    }

    const boardImages: { imageName: string, originName: string}[] = files.map(file => ({
      imageName: file.filename,
      originName: file.originalname
    }));
    const destDir: string = this.configService.get<string>('BOARD_FILE_PATH') ?? '';
    const images = boardImages.map(image => image.imageName);

    try {
      await this.resizing.resizeBoardImages(destDir, images);

      const imageBoard: ImageBoard = ImageBoardMapper.toEntityByPostImageBoardDTO(postDTO, userId);
      const saveBoard: ImageBoard = await this.imageBoardRepository.save(imageBoard);

      const saveImageData: ImageData[] = ImageDataMapper.toEntityByImageNameObject(boardImages, saveBoard.imageNo);
      await this.imageDataRepository.save(saveImageData);

      return { imageNo: saveBoard.imageNo };
    }catch(error) {
      this.logger.error('postImageBoardService error.', error);

      await this.fileService.deleteBoardFiles(destDir, images);

      throw error;
    }
  }

  /**
   * @param imageNo
   * @param userId
   *
   * @returns {
   *   imageNo: number,
   *   imageTitle: string,
   *   imageContent: string,
   *   imageData: string[]
   * }
   */
  async getPatchDataService(imageNo: number, userId: string): Promise<ImageBoardPatchDataResponseDTO> {
    const boardDetail: ImageBoardDetailResponseDTO | null = await this.imageBoardRepository.getImageBoardDetail(imageNo);

    if(!boardDetail)
      throw new NotFoundException();

    if(boardDetail.userId !== userId)
      throw new AccessDeniedException();

    return ImageBoardMapper.convertDetailDTOToPatchDataDTO(boardDetail);
  }

  /**
   * @param imageNo
   * @param{
   *   imageTitle: string,
   *   imageContent: string,
   *   deleteFiles?: string[]
   * } patchDTO
   * @param req
   *
   * @returns { imageNo: number }
   */
  @Transactional()
  async patchImageBoardService(imageNo: number, patchDTO: PatchImageBoardDTO, req: Request): Promise<{ imageNo: number }> {
    const userId: string = getAuthUserId(req);
    const patchBoard: ImageBoard = await this.checkWriter(imageNo, userId);
    const files = req.files as Express.Multer.File[] ?? [];
    const destDir: string = this.configService.get<string>('BOARD_FILE_PATH') ?? '';
    const boardImages: { imageName: string, originName: string}[] = [];
    const images: string[] = [];
    if(files.length > 0) {
      files.forEach(file => {
        boardImages.push({
          imageName: file.filename,
          originName: file.originalname
        })
        images.push(file.filename);
      })
    }
    const originImageDataList: ImageData[] = await this.imageDataRepository.find({ where: { imageNo }, order: { imageStep: 'ASC'} });

    if((originImageDataList.length - (patchDTO.deleteFiles?.length ?? 0) + images.length) > 5){
      await this.fileService.deleteBoardFiles(destDir, images);
      throw new TooManyFilesException();
    }


    // 삭제 파일 목록이 전달되었으나, 기존 파일명과 일치하지 않는 데이터가 있다면
    // BAD_REQUEST
    if(patchDTO.deleteFiles && patchDTO.deleteFiles.length > 0){

      // 추가할 이미지 파일이 없으나,
      // 기존 파일을 모두 삭제하는 요청이라면 BAD_REQUEST
      if(images.length === 0 && patchDTO.deleteFiles.length === originImageDataList.length)
        throw new BadRequestException();

      const originImageNameList: string[] = originImageDataList.map(entity => entity.imageName);

      patchDTO.deleteFiles.forEach(name => {
        if(!originImageNameList.includes(name)){
          if(images.length > 0)
            this.fileService.deleteBoardFiles(destDir, images);

          throw new BadRequestException();
        }

      })
    }

    try {
      if(images.length > 0) {
        await this.resizing.resizeBoardImages(destDir, images);
        const maxImageStep = originImageDataList[originImageDataList.length - 1].imageStep;
        const saveImageData: ImageData[] = ImageDataMapper.toEntityByImageNameObject(boardImages, imageNo, maxImageStep);

        await this.imageDataRepository.save(saveImageData);
      }

      patchBoard.imageTitle = patchDTO.imageTitle;
      patchBoard.imageContent = patchDTO.imageContent;
      await this.imageBoardRepository.save(patchBoard);

      if(patchDTO.deleteFiles){
        await this.imageDataRepository.delete({ imageName: In(patchDTO.deleteFiles) })
      }
    }catch(error) {
      this.logger.error('patchImageBoardService error.', error);

      if(images.length > 0)
        await this.fileService.deleteBoardFiles(destDir, images);

      throw error;
    }

    try {
      if(patchDTO.deleteFiles)
        await this.fileService.deleteBoardFiles(destDir, patchDTO.deleteFiles);
    }catch (error) {
      this.logger.error('patchImageBoardService deleteBoardFiles error.', error);
      this.logger.error('patchImageBoardService deleteBoardFiles filename : ', patchDTO.deleteFiles);
    }

    return { imageNo };
  }

  /**
   * @param imageNo
   * @param userId
   *
   * @return void
   */
  @Transactional()
  async deleteImageBoard(imageNo: number, userId: string): Promise<void> {
    const destDir: string = this.configService.get<string>('BOARD_FILE_PATH') ?? '';
    await this.checkWriter(imageNo, userId);
    const deleteImageData: string[] = await this.imageDataRepository.getImageNameListByImageNo(imageNo);
    
    await this.imageDataRepository.delete({ imageNo });
    await this.imageBoardRepository.delete({ imageNo });
    
    try {
      await this.fileService.deleteBoardFiles(destDir, deleteImageData);
    }catch(error) {
      this.logger.error('deleteImageBoard file delete error.', error);
      this.logger.error('deleteImageBoard file name list is ', deleteImageData);
    }
  }

  /**
   *
   * @private
   *
   * @param imageNo
   * @param userId
   *
   * @return ImageBoard
   *
   * Not found
   * @exception 404 NOT_FOUND
   *
   * writer not equals
   * @exception 403 ACCESS_DENIED
   */
  private async checkWriter(imageNo: number, userId: string): Promise<ImageBoard> {
    const imageBoard: ImageBoard | null = await this.imageBoardRepository.findOne({ where: { imageNo } });

    if(!imageBoard)
      throw new NotFoundException();

    if(imageBoard.userId !== userId)
      throw new AccessDeniedException();

    return imageBoard;
  }
}
