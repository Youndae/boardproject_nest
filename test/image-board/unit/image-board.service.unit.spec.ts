import { ImageBoardService } from '#imageBoard/services/image-board.service';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '#config/logger/logger.service';
import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#src/file/service/resizing.service';
import { FileService } from '#src/file/service/file.service';
import { ImageBoardPatchDataResponseDTO } from '#imageBoard/dtos/out/image-board-patch-data-response.dto';

describe('imageBoardService unitTest', () => {
  let imageBoardService: ImageBoardService;
  let imageBoardRepository: Partial<Record<keyof ImageBoardRepository, jest.Mock>>;
  let imageDataRepository: Partial<Record<keyof ImageDataRepository, jest.Mock>>;

  const userId: string = 'tester';
  const imageDataFixture: ImageData = new ImageData();
  imageDataFixture.imageName = 'testImageName.jpg';
  imageDataFixture.oldName = 'testOldImageName.jpg';
  imageDataFixture.imageStep = 1;
  imageDataFixture.imageNo = 1;
  const imageBoardFixture: ImageBoard = new ImageBoard();
  imageBoardFixture.imageNo = 1;
  imageBoardFixture.imageTitle = 'testTitle';
  imageBoardFixture.imageContent = 'testContent';
  imageBoardFixture.userId = userId;
  imageBoardFixture.imageDate = new Date();
  imageBoardFixture.imageDatas = [imageDataFixture];

  beforeEach(async () => {
    imageBoardRepository = {
      getImageBoardDetail: jest.fn()
    };
    imageDataRepository = { }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ImageBoardService,
        { provide: ImageBoardRepository, useValue: imageBoardRepository },
        { provide: LoggerService, useValue: { info: jest.fn(), error: jest.fn() } },
        { provide: ImageDataRepository, useValue: imageDataRepository },
        { provide: ConfigService, useValue: ConfigService },
        { provide: ResizingService, useValue: ResizingService },
        { provide: FileService, useValue: FileService }
      ]
    })
      .compile();

    imageBoardService = moduleFixture.get<ImageBoardService>(ImageBoardService);
    jest.clearAllMocks();
  })

  describe('getImageBoardDetailService', () => {
    it('정상 조회', async () => {
      const repositoryResult: ImageBoardDetailResponseDTO = new ImageBoardDetailResponseDTO(imageBoardFixture);
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(repositoryResult);

      const result: ImageBoardDetailResponseDTO = await imageBoardService.getImageBoardDetailService(1);

      expect(result).not.toBeNull();
    });

    it('데이터가 없는 경우', async () => {
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(null);

      await expect(imageBoardService.getImageBoardDetailService(1))
        .rejects
        .toThrow('NOT_FOUND');
    });
  });

  describe('getPatchDataService', () => {
    it('정상 조회', async () => {
      const repositoryResult: ImageBoardDetailResponseDTO = new ImageBoardDetailResponseDTO(imageBoardFixture);
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(repositoryResult);

      const result: ImageBoardPatchDataResponseDTO = await imageBoardService.getPatchDataService(1, userId);

      expect(result).not.toBeNull();
      expect(result.imageNo).toBe(1);
      expect(result.imageTitle).toBe(imageBoardFixture.imageTitle);
      expect(result.imageContent).toBe(imageBoardFixture.imageContent);
      expect(result.imageData).not.toStrictEqual([]);
    });

    it('데이터가 없는 경우', async () => {
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(null);

      await expect(imageBoardService.getPatchDataService(1, userId))
        .rejects
        .toThrow('NOT_FOUND');
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const repositoryResult: ImageBoardDetailResponseDTO = new ImageBoardDetailResponseDTO(imageBoardFixture);
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(repositoryResult);

      await expect(imageBoardService.getPatchDataService(1, 'wrongUser'))
        .rejects
        .toThrow('ACCESS_DENIED');
    })
  });
});