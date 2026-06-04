import { Injectable } from '@nestjs/common';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#src/file/service/resizing.service';
import { FileService } from '#src/file/service/file.service';
import { LoggerService } from '#config/logger/logger.service';
import { Transactional } from 'typeorm-transactional';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ImageBoardListResponse } from '#imageBoard/dtos/out/image-board-list.response.dto';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { ImageBoardMapper } from '#imageBoard/mapper/image-board.mapper';
import { ImageBoardPatchDetailResponse } from '#imageBoard/dtos/out/image-board-patch-detail.response.dto';
import { PostImageBoardRequest } from '#imageBoard/dtos/in/post-image-board.request.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { ImageDataMapper } from '#imageBoard/mapper/image-data.mapper';
import { PatchImageBoardRequest } from '#imageBoard/dtos/in/patch-image-board.request.dto';
import { TooManyFilesException } from '#common/exceptions/too-many-files.exception';
import { In } from 'typeorm';
import { ListResponse } from '#common/dtos/out/list.response.dto';

@Injectable()
export class ImageBoardService {
  private readonly destDir: string;
  private readonly logger: LoggerService

  constructor(
    private readonly imageBoardRepository: ImageBoardRepository,
    private readonly imageDataRepository: ImageDataRepository,
    private readonly configService: ConfigService,
    private readonly resizing: ResizingService,
    private readonly fileService: FileService,
    private readonly originalLogger: LoggerService
  ) {
    this.destDir = this.configService.get<string>('BOARD_FILE_PATH') ?? '';
    this.logger = this.originalLogger.setContext(ImageBoardService.name);
  }

  async getListService(pageDTO: PaginationDTO): Promise<ListResponse<ImageBoardListResponse>> {

    return await this.imageBoardRepository.getImageBoardList(pageDTO);
  }

  async getDetailService(id: number): Promise<ImageBoardDetailResponse> {
    const boardDetail: ImageBoardDetailResponse | null = await this.imageBoardRepository.getImageBoardDetail(id);

    if(!boardDetail){
      this.logger.error(
        'imageBoardService.getDetailService NotFoundException.',
        { id }
      );
      throw new BadRequestException();
    }

    return boardDetail;
  }

  @Transactional()
  async postBoardService(postDTO: PostImageBoardRequest, files: Express.Multer.File[], userId: number): Promise<number> {
    if(!files || files.length < 1){
      this.logger.error('imageBoardService.postBoardService postImageBoard file is undefined. userId : ', userId);
      throw new BadRequestException();
    }

    const uploadedFiles: string[] = [];

    try {
      const boardImages = await this.getBoardImages(files, uploadedFiles);

      const imageBoard: ImageBoard = ImageBoardMapper.toEntityByPostImageBoardDTO(postDTO, userId);
      const saveBoard: ImageBoard = await this.imageBoardRepository.save(imageBoard);

      const saveImageData: ImageData[] = ImageDataMapper.toEntityByImageNameObject(boardImages, saveBoard.id);
      await this.imageDataRepository.save(saveImageData);

      return saveBoard.id;
    }catch(error) {
      this.logger.error('imageBoardService.postBoardService error.', error);

      await this.fileService.deleteBoardFiles(this.destDir, uploadedFiles);

      throw error;
    }
  }

  async getPatchDataService(id: number, userId: string): Promise<ImageBoardPatchDetailResponse> {
    const boardDetail: ImageBoardDetailResponse | null = await this.imageBoardRepository.getImageBoardDetail(id);

    if(!boardDetail){
      this.logger.warn('imageBoardService.getPatchDataService :: ImageBoard Data not found', { id, userId });
      throw new BadRequestException();
    }


    if(boardDetail.writerId !== userId){
      this.logger.warn('imageBoardService.getPatchDataService :: writer and userId not equals', { writer: boardDetail.writerId, userId});
      throw new AccessDeniedException();
    }


    const imageList: ImageData[] = await this.imageDataRepository.findAllByImageId(id);

    return new ImageBoardPatchDetailResponse(boardDetail, imageList);
  }

  @Transactional()
  async patchImageBoardService(id: number, patchDTO: PatchImageBoardRequest, files: Express.Multer.File[], userId: number): Promise<number> {
    // patchBoard 객체를 함수 내부에서 save()로 재사용해야 하기 때문에 checkWriter 함수 호출 대신 직접 조회해 검증.
    const patchBoard: ImageBoard | null = await this.imageBoardRepository.findById(id);
    if(!patchBoard) {
      this.logger.warn(
        'imageBoardService.patchBoard :: patchBoard NotFoundException',
        { id, userId}
      );
      throw new BadRequestException();
    }

    if(patchBoard.userId !== userId) {
      this.logger.error(
        'imageBoardService.patchBoard :: User is not author of the patchBoard',
        { id, userId }
      );
      throw new AccessDeniedException();
    }

    const fileNames: string[] = files ? files.map(image => image.filename) : [];
    const originImageDataList: ImageData[] = await this.imageDataRepository.findAllByImageId(id);

    // 기존 이미지 - 삭제할 이미지 + 새로운 이미지가 5장이 넘어가면 파일 개수 제한 오류,
    if((originImageDataList.length - (patchDTO.deleteFiles?.length ?? 0) + fileNames.length) > 5){
      await this.fileService.deleteBoardFiles(this.destDir, fileNames);
      throw new TooManyFilesException();
    }

    // 삭제 파일 목록이 전달되었으나, 기존 파일명과 일치하지 않는 데이터가 있다면
    // BAD_REQUEST
    if(patchDTO.deleteFiles && patchDTO.deleteFiles.length > 0){
      // 추가할 이미지 파일이 없으나,
      // 기존 파일을 모두 삭제하는 요청이라면 BAD_REQUEST
      if(fileNames.length === 0 && patchDTO.deleteFiles.length === originImageDataList.length)
        throw new BadRequestException();

      const originImageNameList: string[] = originImageDataList.map(entity => entity.imageName);

      patchDTO.deleteFiles.forEach(name => {
        if(!originImageNameList.includes(name)){
          if(files && files.length > 0){
            this.fileService.deleteBoardFiles(this.destDir, fileNames);
          }


          throw new BadRequestException();
        }

      })
    }
    const uploadedFiles: string[] = [];

    try {
      if(fileNames.length > 0) {
        const boardImages = await this.getBoardImages(files, uploadedFiles);
        const maxImageStep = originImageDataList[originImageDataList.length - 1].imageStep;
        const saveImageData: ImageData[] = ImageDataMapper.toEntityByImageNameObject(boardImages, id, maxImageStep);

        await this.imageDataRepository.save(saveImageData);
      }

      patchBoard.title = patchDTO.title;
      patchBoard.content = patchDTO.content;
      await this.imageBoardRepository.save(patchBoard);

      if(patchDTO.deleteFiles){
        await this.imageDataRepository.delete({ imageName: In(patchDTO.deleteFiles) })
      }
    }catch(error) {
      this.logger.error('patchImageBoardService error.', error);

      if(uploadedFiles.length > 0)
        await this.fileService.deleteBoardFiles(this.destDir, uploadedFiles);

      throw error;
    }

    try {
      if(patchDTO.deleteFiles)
        await this.fileService.deleteBoardFiles(this.destDir, patchDTO.deleteFiles);
    }catch (error) {
      this.logger.error('patchImageBoardService deleteBoardFiles error.', error);
      this.logger.error('patchImageBoardService deleteBoardFiles filename : ', patchDTO.deleteFiles);
    }

    return id;
  }

  private async getBoardImages(files: Express.Multer.File[], uploadedFiles: string[]): Promise<{ imageName: string, originName: string }[]> {
    return await Promise.all(
      files.map(async (file) => {
        uploadedFiles.push(file.filename);

        // 현재 jpg로 확장자 고정이므로 확장자가 수정된 파일명을 받을 필요가 있음.
        // 리사이징된 파일이 아닌 확장자만 수정된 원본.
        const resizedFilename: string = await this.resizing.resizeBoardImage(this.destDir, file.filename);

        // 애초에 사용자가 jpg 파일을 업로드 했다면 동일할것이므로 따로 처리하지 않아도 됨.
        // jpg로 변환된 경우에만 catch에서 삭제하도록 예외처리 하기 위해 담아줌.
        if(file.filename !== resizedFilename)
          uploadedFiles.push(resizedFilename);

        return {
          imageName: resizedFilename,
          originName: file.originalname
        };
      })
    );
  }

  @Transactional()
  async deleteImageBoard(id: number, userId: number): Promise<void> {
    await this.checkWriter(id, userId);
    const deleteImageNameList: string[] = await this.imageDataRepository.getImageNameListByImageNo(id);
    
    await this.imageDataRepository.delete({ imageId: id });
    await this.imageBoardRepository.delete({ id });
    
    try {
      await this.fileService.deleteBoardFiles(this.destDir, deleteImageNameList);
    }catch(error) {
      this.logger.error('deleteImageBoard file delete error.', error);
      this.logger.error('deleteImageBoard file name list is ', deleteImageNameList);
    }
  }

  private async checkWriter(id: number, userId: number): Promise<void> {
    const writer: number | null = await this.imageBoardRepository.findUserIdById(id);

    if(!writer){
      this.logger.warn('imageBoardService.checkWriter :: writer is null.', { writer, userId });
      throw new BadRequestException();
    }

    if(writer !== userId){
      this.logger.warn('imageBoardService.checkWriter :: writer and userId not equals', { writer, userId });
      throw new AccessDeniedException();
    }

  }
}
