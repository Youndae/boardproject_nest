import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ImageBoardService } from '#imageBoard/services/image-board.service';
import { MemberRepository } from '#member/repositories/member.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { Member } from '#member/entities/member.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageBoardModule } from '#imageBoard/image-board.module';
import { MemberModule } from '#member/member.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { ResizingService } from '#src/file/service/resizing.service';
import { FileService } from '#src/file/service/file.service';
import { ConfigService } from '@nestjs/config';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { ImageBoardListResponseDTO } from '#imageBoard/dtos/out/image-board-list-response.dto';
import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';
import { ImageDataResponseDTO } from '#imageBoard/dtos/out/image-data-response.dto';
import { PostImageBoardDTO } from '#imageBoard/dtos/in/post-image-board.dto';
import { ImageBoardPatchDataResponseDTO } from '#imageBoard/dtos/out/image-board-patch-data-response.dto';
import { PatchImageBoardDTO } from '#imageBoard/dtos/in/patch-image-board.dto';

describe('image-board.service Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let imageBoardService: ImageBoardService;
  let memberRepository: MemberRepository;
  let imageBoardRepository: ImageBoardRepository;
  let imageDataRepository: ImageDataRepository;
  let configService: ConfigService;
  let resizingService: ResizingService;
  let fileService: FileService;

  let testBoard: ImageBoard;
  let testBoardImageData: ImageData[];
  let boardListCount: number = 20;
  const member: Member = new Member();

  const boardAmount: number = 15;

  let destDir: string;

  const getReq = () => {
    const user = {
      userId: member.userId,
      role: ['ROLE_MEMBER']
    };

    const req: any = {
      files: [
        { filename: 'file1.png', originalname: 'file1OldName.png' },
        { filename: 'file2.png', originalname: 'file2OldName.png' },
        { filename: 'file3.png', originalname: 'file3OldName.png' }
      ],
      user: user
    }

    return req;
  }

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ImageBoardModule,
        MemberModule,
        TestDatabaseModule
      ],
      providers: [
        ImageBoardService,
        MemberRepository,
        ImageBoardRepository,
        ImageDataRepository
      ]
    })
      .overrideProvider(ResizingService)
      .useValue({ resizeBoardImages: jest.fn() })
      .overrideProvider(FileService)
      .useValue({
        deleteBoardFiles: jest.fn(),
      })
      .compile();

    imageBoardService = moduleFixture.get<ImageBoardService>(ImageBoardService);
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    imageBoardRepository = moduleFixture.get<ImageBoardRepository>(ImageBoardRepository);
    imageDataRepository = moduleFixture.get<ImageDataRepository>(ImageDataRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    resizingService = moduleFixture.get<ResizingService>(ResizingService);
    fileService = moduleFixture.get<FileService>(FileService);

    app = moduleFixture.createNestApplication();

    destDir = configService.get<string>('PROFILE_FILE_PATH') ?? '';
    await app.init();

    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    member.userId = 'tester';
    member.userPw = '1234';
    member.userName = 'testerName';
    member.nickName = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profileThumbnail = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    await memberRepository.save(saveMember);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();

    const imageBoardArr: ImageBoard[] = [];
    const imageDataArr: ImageData[] = [];

    for(let i  = 0; i < boardListCount; i++) {
      imageBoardArr.push(
        imageBoardRepository.create({
          userId: member.userId,
          imageTitle: `testImageTitle${i}`,
          imageContent: `testImageContent${i}`
        })
      );
    };

    const saveImageBoardList: ImageBoard[] = await imageBoardRepository.save(imageBoardArr);

    for(const saveBoard of saveImageBoardList) {
      for(let i = 0; i < 3; i++) {
        imageDataArr.push(
          imageDataRepository.create({
            imageName: `board/${saveBoard.imageTitle}'sImage${i}.jpg`,
            imageNo: saveBoard.imageNo,
            oldName: `${saveBoard.imageTitle}'sOriginName${i}.jpg`,
            imageStep: i
          })
        );
      }
    }

    const saveImageDataList: ImageData[] = await imageDataRepository.save(imageDataArr);

    testBoard = saveImageBoardList[0];
    testBoardImageData = saveImageDataList.filter(v => v.imageNo === testBoard.imageNo);
  })

  afterAll(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    await dataSource.destroy();
    await app.close();
  });

  describe('getImageBoardListService', () => {
    it('정상 조회.', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list.length).toBe(boardAmount);
      expect(result.totalElements).toBe(boardListCount);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.list) {
        expect(listDTO.imageTitle.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image0.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      await imageDataRepository.deleteAll();
      await imageBoardRepository.deleteAll();

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it('정상 조회. 제목 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
      expect(result.list[0].imageTitle.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'c';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
      expect(result.list[0].imageTitle.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'tc';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
      expect(result.list[0].imageTitle.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = 'test';
      pageDTO.searchType = 'u';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list.length).toBe(boardAmount);
      expect(result.totalElements).toBe(boardListCount);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.list) {
        expect(listDTO.imageTitle.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image0.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('잘못된 검색 타입을 요청한 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'ab';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.pageNum = 2;

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardService.getImageBoardListService(pageDTO);

      const page2ElementsCount: number = boardListCount - boardAmount;

      expect(result.list.length).toBe(page2ElementsCount);
      expect(result.totalElements).toBe(boardListCount);

      let listNumber: number = page2ElementsCount - 1;
      result.list.forEach(dto =>
        expect(dto.imageTitle.endsWith(`Title${listNumber--}`))
      );
    });
  });

  describe('getImageBoardDetailService', () => {
    it('정상 조회.', async () => {
      const result: ImageBoardDetailResponseDTO = await imageBoardService.getImageBoardDetailService(testBoard.imageNo);

      expect(result.imageNo).toBe(testBoard.imageNo);
      expect(result.imageTitle).toBe(testBoard.imageTitle);
      expect(result.imageContent).toBe(testBoard.imageContent);
      expect(result.userId).toBe(testBoard.userId);
      expect(result.imageDate).toBeDefined();
      expect(result.imageData).not.toStrictEqual([]);

      const imageDataFixture: ImageDataResponseDTO[] = testBoardImageData.map(data => new ImageDataResponseDTO(data));
      expect(result.imageData).toEqual(imageDataFixture);
    });

    it('데이터가 없는 경우', async () => {
      await expect(imageBoardService.getImageBoardDetailService(0))
        .rejects
        .toThrow('NOT_FOUND');
    })
  });

  describe('postImageBoardService', () => {
    const postDTO: PostImageBoardDTO = new PostImageBoardDTO();
    postDTO.imageTitle = 'testPostTitle';
    postDTO.imageContent = 'testPostContent';

    it('정상 처리', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);

      const req = getReq();

      const result: { imageNo: number } = await imageBoardService.postImageBoardService(postDTO, req);

      expect(resizingService.resizeBoardImages).toHaveBeenCalledTimes(1);
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();

      const saveImageNo: number = result.imageNo;
      const saveBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: saveImageNo } });

      expect(saveBoard).not.toBeNull();
      expect(saveBoard?.imageTitle).toBe(postDTO.imageTitle);
      expect(saveBoard?.imageContent).toBe(postDTO.imageContent);
      expect(saveBoard?.userId).toBe(req.user.userId);

      const saveImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: saveImageNo }, order: { imageStep: 'ASC' } });

      saveImageData.forEach((data, idx) => {
        expect(data.imageName).toBe(`board/file${idx + 1}.png`);
        expect(data.oldName).toBe(`file${idx + 1}OldName.png`);
        expect(data.imageStep).toBe(idx + 1);
      })
    });

    it('req.files가 undefined인 경우', async () => {
      const reqFixture = getReq();
      const req: any = {
        user: reqFixture.user,
      };

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.postImageBoardService(postDTO, req))
        .rejects
        .toThrow('BAD_REQUEST');

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('req.files가 []인 경우', async () => {
      const reqFixture = getReq();
      const req: any = {
        user: reqFixture.user,
        files: []
      };

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.postImageBoardService(postDTO, req))
        .rejects
        .toThrow('BAD_REQUEST');

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('리사이징 중 오류가 발생한 경우', async () => {
      const req = getReq();

      (resizingService.resizeBoardImages as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.postImageBoardService(postDTO, req))
        .rejects
        .toThrow("");

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPatchDataService', () => {
    it('정상 조회.', async () => {
      const result: ImageBoardPatchDataResponseDTO = await imageBoardService.getPatchDataService(testBoard.imageNo, member.userId);

      expect(result.imageTitle).toBe(testBoard.imageTitle);
      expect(result.imageContent).toBe(testBoard.imageContent);

      const imageNameFixture: string[] = testBoardImageData.map(entity => entity.imageName);
      result.imageData.forEach(v => expect(imageNameFixture.includes(v)).toBeTruthy());
    });

    it('데이터가 없는 경우', async () => {
      await expect(imageBoardService.getPatchDataService(0, member.userId))
        .rejects
        .toThrow('NOT_FOUND');
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(imageBoardService.getPatchDataService(testBoard.imageNo, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');
    });
  });

  describe('patchImageBoardService', () => {
    const patchDTO: PatchImageBoardDTO = new PatchImageBoardDTO();
    patchDTO.imageTitle = 'patchTestTitle';
    patchDTO.imageContent = 'patchTestContent';

    it('정상 처리. 추가할 이미지 파일과 삭제할 파일명 모두 포함', async () => {
      patchDTO.deleteFiles = [testBoardImageData[0].imageName];
      const req = getReq();

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const result: { imageNo: number } = await imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req);

      expect(result.imageNo).toBe(testBoard.imageNo);
      expect(resizingService.resizeBoardImages).toHaveBeenCalledTimes(1);
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: result.imageNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.imageTitle).toBe(patchDTO.imageTitle);
      expect(patchBoard?.imageContent).toBe(patchDTO.imageContent);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: result.imageNo } });
      const patchImageDataNames: string[] = patchImageData.map(entity => entity.imageName);
      const imageDataSize: number = testBoardImageData.length - patchDTO.deleteFiles.length + req.files.length;

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(imageDataSize);
      patchDTO.deleteFiles.forEach(deleteName => expect(patchImageDataNames.includes(deleteName)).toBeFalsy());
      req.files.forEach(file => {
        const saveFilename: string = `board/${file.filename}`;
        expect(patchImageDataNames.includes(saveFilename)).toBeTruthy()
      });
    });

    it('정상 처리. 파일 추가 없이 삭제와 데이터 갱신', async () => {
      const user = getReq().user;
      const req: any = { user };
      patchDTO.deleteFiles = [testBoardImageData[0].imageName];

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const result: { imageNo: number } = await imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req);

      expect(result.imageNo).toBe(testBoard.imageNo);
      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: result.imageNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.imageTitle).toBe(patchDTO.imageTitle);
      expect(patchBoard?.imageContent).toBe(patchDTO.imageContent);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: result.imageNo } });
      const patchImageDataNames: string[] = patchImageData.map(entity => entity.imageName);
      const imageDataSize: number = testBoardImageData.length - patchDTO.deleteFiles.length;

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(imageDataSize);
      patchDTO.deleteFiles.forEach(deleteName => expect(patchImageDataNames.includes(deleteName)).toBeFalsy());
    });

    it('파일 추가로 인해 5장이 넘어가는 경우', async () => {
      const req = getReq();
      patchDTO.deleteFiles = undefined;

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req))
        .rejects
        .toThrow('TOO_MANY_FILES');

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
    });

    it('파일 추가 없이 모든 파일을 삭제하는 요청인 경우', async () => {
      const user = getReq().user;
      const req: any = { user };
      patchDTO.deleteFiles = testBoardImageData.map(data => data.imageName);

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req))
        .rejects
        .toThrow('BAD_REQUEST');

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('삭제할 파일명 중 해당 게시글의 파일명이 아닌 경우', async () => {
      const req = getReq();
      patchDTO.deleteFiles = ['board/wrongFileName.png'];

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req))
        .rejects
        .toThrow('BAD_REQUEST');

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
    });

    it('삭제할 파일명 중 해당 게시글의 파일명이 아니고 추가하는 파일이 없는 경우', async () => {
      const user = getReq().user;
      const req: any = { user };
      patchDTO.deleteFiles = ['board/wrongFileName.png'];

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req))
        .rejects
        .toThrow('BAD_REQUEST');

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('삭제 요청된 파일 처리 중 오류가 발생하는 경우', async () => {
      const req = getReq();
      patchDTO.deleteFiles = [testBoardImageData[0].imageName];

      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });

      const result: { imageNo: number } = await imageBoardService.patchImageBoardService(testBoard.imageNo, patchDTO, req);

      expect(result).toBeDefined();
      expect(result.imageNo).toBe(testBoard.imageNo);

      expect(resizingService.resizeBoardImages).toHaveBeenCalledTimes(1);
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: result.imageNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.imageTitle).toBe(patchDTO.imageTitle);
      expect(patchBoard?.imageContent).toBe(patchDTO.imageContent);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: result.imageNo } });
      const patchImageDataNames: string[] = patchImageData.map(entity => entity.imageName);
      const imageDataSize: number = testBoardImageData.length - patchDTO.deleteFiles.length + req.files.length;

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(imageDataSize);
      patchDTO.deleteFiles.forEach(deleteName => expect(patchImageDataNames.includes(deleteName)).toBeFalsy());
      req.files.forEach(file => {
        const saveFilename: string = `board/${file.filename}`;
        expect(patchImageDataNames.includes(saveFilename)).toBeTruthy()
      });
    })
  });

  describe('deleteImageBoard', () => {
    it('정상 처리.', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await imageBoardService.deleteImageBoard(testBoard.imageNo, testBoard.userId);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: testBoard.imageNo } });
      expect(deleteBoard).toBeNull();

      const deleteImageData: ImageData[] | null = await imageDataRepository.find({ where: { imageNo: testBoard.imageNo } });
      expect(deleteImageData).toStrictEqual([]);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.deleteImageBoard(testBoard.imageNo, 'noneUser'))
        .rejects
        .toThrow('ACCESS_DENIED');

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: testBoard.imageNo } });
      expect(deleteBoard).not.toBeNull();

      const deleteImageData: ImageData[] | null = await imageDataRepository.find({ where: { imageNo: testBoard.imageNo } });
      expect(deleteImageData).not.toStrictEqual([]);
    });

    it('데이터가 없는 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.deleteImageBoard(0, member.userId))
        .rejects
        .toThrow('NOT_FOUND');

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('파일 삭제에서 오류가 발생한 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });

      await imageBoardService.deleteImageBoard(testBoard.imageNo, testBoard.userId);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: testBoard.imageNo } });
      expect(deleteBoard).toBeNull();

      const deleteImageData: ImageData[] | null = await imageDataRepository.find({ where: { imageNo: testBoard.imageNo } });
      expect(deleteImageData).toStrictEqual([]);
    })
  });
});