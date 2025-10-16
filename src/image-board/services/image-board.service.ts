import { Injectable } from '@nestjs/common';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#common/services/resizing.service';
import { FileService } from '#common/services/file.service';
import { LoggerService } from '#config/logger/logger.service';
import { Transactional } from 'typeorm-transactional';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';

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
   *   list: ? [
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
  @Transactional()
  async getImageBoardListService(): Promise<void> {
    // TODO: const listAndTotalElements: { list: ?[], totalElements: number } = await this.imageBoardRepository.getImageBoardList(pageDTO);

    // TODO: return listAndTotalElements;
  }

  /**
   * @param{
   *   imageNo: number
   * }
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
   * }
   *
   * Not found
   * @exception 404 NOT_FOUND
   */
  async getImageBoardDetailService(): Promise<void> {
    // TODO: const boardDetail: ? = await this.imageBoardRepository.getImageBoardDetail(imageNo);

    // TODO: if(!boardDetail) throw new NotFoundException();

    // TODO: return boardDetail;
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
  async postImageBoardService(): Promise<void> {
    // TODO: let imageData: { imageName: string, originName: string } | undefined; => []
    // TODO: destDir: string = this.configService.get<string>('BOARD_FILE_PATH') ?? '';

    // TODO: try-catch
    // TODO: try
    // TODO: if(req.file)
    // TODO: const { filename: storedFilename, originName: ?? } = req.files; => []
    // TODO: storedFilename.forEach((file) => await this.resizing.resizeBoardImage(destDir, file)); => ?
    // TODO: imageData = ?? => storedFilename 배열을 담는 { imageName: storedFilename, originName: originName }[]
    // TODO: end if
    // TODO: const saveImageBoard: ImageBoard = await mapper.toEntityByPostDTO(postDTO);
    // TODO: const saveImageData: ImageData[] = await mapper.toEntityByImageDataArray(imageData);
    // TODO: const saveBoardNo: number = await imageBoardRepository.save(saveImageBoard).imageNo;
    // TODO: saveImageData.forEach((data) => data.imageNo = saveBoardNo);
    // TODO: await imageDataRepository.save(saveImageData);

    // TODO: catch
    // TODO: if(imageData)
    // TODO: imageData.forEach((data) => fileService.deleteFile(`${destDir}/${data.imageName}`));
    // TODO: throw
  }

  /**
   * @param imageNo
   * @param userId
   *
   * @returns {
   *   imageNo: number,
   *   imageTitle: string,
   *   imageContent: string,
   *   imageData: string[{ imageName: string }]
   * }
   */
  async getPatchDataService(): Promise<void> {
    // TODO: const imageBoard: ImageBoard = this.checkWriter(imageNo, userId);

    // TODO: return new ?(imageBoard);
  }

  /**
   * @param{
   *   imageTitle: string,
   *   imageContent: string,
   *   deleteFiles?: string[{ imageName: string }]
   * } patchDTO
   * @param req
   *
   * @returns { imageNo: number }
   */
  async patchImageBoardService(): Promise<void> {
    // TODO: const patchBoard: ImageBoard = await this.checkWriter(imageNo, userId);
    // TODO: let imageData: { imageName: string, originName: string } | undefined; => []
    // TODO: destDir: string = this.configService.get<string>('BOARD_FILE_PATH') ?? '';

    // TODO: try-catch
    // TODO: try
    // TODO: const imageDataList: ImageData[] = await this.imageDataRepository.find({ where: { imageNo } });
    // TODO: const deleteFilesSize = patchDTO.deleteFiles ? patchDTO.deleteFiles.length : 0;
    // TODO: if((imageDataList - deleteFileSize + req.files.length) > 5) throw TooManyFilesException();
    // TODO: if(req.file)
    // TODO: const { filename: storedFilename, originName: ?? } = req.files; => []
    // TODO: storedFilename.forEach((file) => await this.resizing.resizeBoardImage(destDir, file)); => ?
    // TODO: imageData = ?? => storedFilename 배열을 담는 { imageName: storedFilename, originName: originName }[]
    // TODO: end if
    // TODO: patchBoard.title = patchDTO.title; patchBoard.content = patchDTO.content;
    // TODO: const saveImageData: ImageData[] = await mapper.toEntityByImageDataArrayAndStep(imageData, imageData[length - 1].step + 1);
    // TODO: const saveBoardNo: number = await imageBoardRepository.save(saveImageBoard).imageNo;
    // TODO: saveImageData.forEach((data) => data.imageNo = saveBoardNo);
    // TODO: await imageDataRepository.save(saveImageData);
    // TODO: if(deleteFiles)
    // TODO: await this.imageDataRepository.deleteImageData(deleteFiles);
    // TODO: deleteFiles.forEach((imageName) => {const deleteFilename = imageName.replace('/board/', '');
    // TODO;                                        fileService.deleteFiles(`${destDir}/${deleteFilename}`)});
    // TODO: end if

    // TODO: catch
    // TODO: if(imageData)
    // TODO: imageData.forEach((data) => fileService.deleteFile(`${destDir}/${data.imageName}`));
    // TODO: throw
  }

  /**
   * @param imageNo: number
   * @param userId: string
   *
   * @return void
   */
  @Transactional()
  async deleteImageBoard(): Promise<void> {
    // TODO: const deleteBoard: ImageBoard = await this.checkWriter(imageNo, userId);
    // TODO: const deleteImageData: string[] = await this.imageDataRepository.find({ where: { imageNo } });
    // TODO: await this.imageDataRepository.delete({ where: { imageNo } });
    // TODO: await this.imageBoardRepository.delete({ where: { imageNo } });

    // TODO: try-catch
    // TODO: try
    // TODO: deleteImageData.forEach((imageName) => { const deleteFilename = replace(...); fileService.deleteFile(...) })
    // TODO: catch
    // TODO: logger
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
  private async checkWriter(): Promise<void> {}
}
