import { ImageBoardService } from '#imageBoard/services/image-board.service';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '#config/logger/logger.service';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ConfigService } from '@nestjs/config';
import { ResizingService } from '#src/file/service/resizing.service';
import { FileService } from '#src/file/service/file.service';
import { ImageBoardPatchDetailResponse } from '#imageBoard/dtos/out/image-board-patch-detail.response.dto';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { ImageDataResponse } from '#imageBoard/dtos/out/image-data.response.dto';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { Member } from '#member/entities/member.entity';

describe('imageBoardService unitTest', () => {
  let imageBoardService: ImageBoardService;
  let imageBoardRepository: Partial<Record<keyof ImageBoardRepository, jest.Mock>>;
  let imageDataRepository: Partial<Record<keyof ImageDataRepository, jest.Mock>>;

  const member: Member = new Member();
  member.id = 1;
  member.userId = 'tester';
  member.password = '1234';
  member.username = 'testerName';
  member.nickname = 'testerNick';
  member.email = 'tester@tester.com';
  member.profile = null;
  member.provider = 'local';


  const imageDataFixture: ImageData = new ImageData();
  imageDataFixture.imageName = 'testImageName.jpg';
  imageDataFixture.originName = 'testOldImageName.jpg';
  imageDataFixture.imageStep = 1;
  imageDataFixture.imageId = 1;
  const imageBoardFixture: ImageBoard = new ImageBoard();
  imageBoardFixture.id = 1;
  imageBoardFixture.title = 'testTitle';
  imageBoardFixture.content = 'testContent';
  imageBoardFixture.userId = member.id;
  imageBoardFixture.createdAt = new Date();
  imageBoardFixture.imageDatas = [imageDataFixture];
  imageBoardFixture.member = member;


  beforeEach(async () => {
    imageBoardRepository = {
      getImageBoardDetail: jest.fn()
    };
    imageDataRepository = {
      findAllByImageId: jest.fn()
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ImageBoardService,
        { provide: ImageBoardRepository, useValue: imageBoardRepository },
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setContext: jest.fn().mockReturnThis()
          },
        },
        { provide: ImageDataRepository, useValue: imageDataRepository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('/test/board/file/path'),
          },
        },
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
      const repositoryResult: ImageBoardDetailResponse = new ImageBoardDetailResponse(imageBoardFixture);
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(repositoryResult);

      const result: ImageBoardDetailResponse = await imageBoardService.getDetailService(1);

      expect(result).not.toBeNull();
    });

    it('데이터가 없는 경우', async () => {
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(null);

      await expect(imageBoardService.getDetailService(1))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getPatchDataService', () => {
    it('정상 조회', async () => {
      const baseDTOResponse: ImageBoardDetailResponse = new ImageBoardDetailResponse(imageBoardFixture);
      const imageDataResult: ImageDataResponse[] = imageBoardFixture.imageDatas.map(v => new ImageDataResponse(v));
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(baseDTOResponse);
      imageDataRepository.findAllByImageId?.mockResolvedValue(imageDataResult);

      const result: ImageBoardPatchDetailResponse = await imageBoardService.getPatchDataService(1, member.userId);

      expect(result).not.toBeNull();
      expect(result.title).toBe(imageBoardFixture.title);
      expect(result.content).toBe(imageBoardFixture.content);
      expect(result.imageList).not.toStrictEqual([]);
      expect(result.imageList).toStrictEqual(imageDataResult);
    });

    it('데이터가 없는 경우', async () => {
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(null);

      await expect(imageBoardService.getPatchDataService(1, member.userId))
        .rejects
        .toThrow(BadRequestException);

      expect(imageDataRepository.findAllByImageId).not.toHaveBeenCalled();
    });

    it('작성자가 일치하지 않는 경우', async () => {
      const baseDTOResponse: ImageBoardDetailResponse = new ImageBoardDetailResponse(imageBoardFixture);
      imageBoardRepository.getImageBoardDetail?.mockResolvedValue(baseDTOResponse);


      await expect(imageBoardService.getPatchDataService(1, 'wrongUser'))
        .rejects
        .toThrow(AccessDeniedException);

      expect(imageDataRepository.findAllByImageId).not.toHaveBeenCalled();
    })
  });
});