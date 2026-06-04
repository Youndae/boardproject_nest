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
import { ImageBoardListResponse } from '#imageBoard/dtos/out/image-board-list.response.dto';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { PostImageBoardRequest } from '#imageBoard/dtos/in/post-image-board.request.dto';
import { ImageBoardPatchDetailResponse } from '#imageBoard/dtos/out/image-board-patch-detail.response.dto';
import { PatchImageBoardRequest } from '#imageBoard/dtos/in/patch-image-board.request.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { getTotalPages } from '../../utils/pagination.utils';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { TooManyFilesException } from '#common/exceptions/too-many-files.exception';

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

  const boardAmount: number = PAGE_AMOUNT.IMAGE;

  let destDir: string;

  const getReq = () => {
    const user = {
      userId: member.userId,
      role: ['ROLE_MEMBER']
    };

    const req: any = {
      files: [
        { filename: 'file1.png', originalname: 'file1OldName.png' },
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
      .useValue({ resizeBoardImage: jest.fn() })
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
    member.password = '1234';
    member.username = 'testerName';
    member.nickname = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profile = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    const savedMember: Member = await memberRepository.save(saveMember);
    member.id = savedMember.id;
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
          userId: member.id,
          title: `testImageTitle${i}`,
          content: `testImageContent${i}`
        })
      );
    };

    const saveImageBoardList: ImageBoard[] = await imageBoardRepository.save(imageBoardArr);

    for(const saveBoard of saveImageBoardList) {
      for(let i = 1; i <= 3; i++) {
        imageDataArr.push(
          imageDataRepository.create({
            imageName: `${saveBoard.title}'sImage${i}.jpg`,
            imageId: saveBoard.id,
            originName: `${saveBoard.title}'sOriginName${i}.jpg`,
            imageStep: i
          })
        );
      }
    }

    const saveImageDataList: ImageData[] = await imageDataRepository.save(imageDataArr);

    testBoard = saveImageBoardList[0];
    testBoardImageData = saveImageDataList.filter(v => v.imageId === testBoard.id);
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

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(result.items.length).toBe(boardAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.items) {
        expect(listDTO.title.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image1.jpg`)).toBeTruthy();
        objectCount--;
      }
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      await imageDataRepository.deleteAll();
      await imageBoardRepository.deleteAll();

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);

      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 제목 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
      expect(result.items[0].title.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'c';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
      expect(result.items[0].title.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'tc';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
      expect(result.items[0].title.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = 'test';
      pageDTO.searchType = 'u';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(result.items.length).toBe(boardAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.items) {
        expect(listDTO.title.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image1.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('잘못된 검색 타입을 요청한 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'ab';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);

      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.page = 2;

      const result: ListResponse<ImageBoardListResponse> = await imageBoardService.getListService(pageDTO);
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      const page2ElementsCount: number = boardListCount - boardAmount;

      expect(result.items.length).toBe(page2ElementsCount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(2);

      let listNumber: number = page2ElementsCount - 1;
      result.items.forEach(dto =>
        expect(dto.title.endsWith(`Title${listNumber--}`))
      );
    });
  });

  describe('getImageBoardDetailService', () => {
    it('정상 조회.', async () => {
      const result: ImageBoardDetailResponse = await imageBoardService.getDetailService(testBoard.id);

      expect(result.title).toBe(testBoard.title);
      expect(result.content).toBe(testBoard.content);
      expect(result.writer).toBe(member.nickname);
      expect(result.writerId).toBe(member.userId);
      expect(result.createdAt).toBeDefined();
      expect(result.imageDataList).not.toStrictEqual([]);

      const imageDataFixture: string[] = testBoardImageData.map(data => data.imageName);
      expect(result.imageDataList).toStrictEqual(imageDataFixture);
    });

    it('데이터가 없는 경우', async () => {
      await expect(imageBoardService.getDetailService(0))
        .rejects
        .toThrow(BadRequestException);
    })
  });

  describe('postImageBoardService', () => {
    const postDTO: PostImageBoardRequest = new PostImageBoardRequest();
    postDTO.title = 'testPostTitle';
    postDTO.content = 'testPostContent';

    it('정상 처리', async () => {
      const req = getReq();
      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(req.files[0].filename);

      const result: number = await imageBoardService.postBoardService(postDTO, req.files, member.id);

      expect(resizingService.resizeBoardImage).toHaveBeenCalledTimes(req.files.length);
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();


      const saveBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: result } });

      expect(saveBoard).not.toBeNull();
      expect(saveBoard?.title).toBe(postDTO.title);
      expect(saveBoard?.content).toBe(postDTO.content);
      expect(saveBoard?.userId).toBe(member.id);

      const saveImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: result }, order: { imageStep: 'ASC' } });

      saveImageData.forEach((data, idx) => {
        expect(data.imageName).toBe(`file${idx + 1}.png`);
        expect(data.originName).toBe(`file${idx + 1}OldName.png`);
        expect(data.imageStep).toBe(idx + 1);
      })
    });

    it('req.files가 undefined인 경우', async () => {
      const reqFixture = getReq();
      const req: any = {
        user: reqFixture.user,
      };

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.postBoardService(postDTO, req.files, member.id))
        .rejects
        .toThrow(BadRequestException);

      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('req.files가 []인 경우', async () => {
      const reqFixture = getReq();
      const req: any = {
        user: reqFixture.user,
        files: []
      };

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.postBoardService(postDTO, req.files, member.id))
        .rejects
        .toThrow(BadRequestException);

      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('리사이징 중 오류가 발생한 경우', async () => {
      const req = getReq();

      (resizingService.resizeBoardImage as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.postBoardService(postDTO, req.files, member.id))
        .rejects
        .toThrow("");

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPatchDataService', () => {
    it('정상 조회.', async () => {
      const result: ImageBoardPatchDetailResponse = await imageBoardService.getPatchDataService(testBoard.id, member.userId);

      expect(result.title).toBe(testBoard.title);
      expect(result.content).toBe(testBoard.content);

      const imageNameFixture: string[] = testBoardImageData.map(entity => entity.imageName);
      result.imageList.forEach(v => expect(imageNameFixture.includes(v.imageName)).toBeTruthy());
    });

    it('데이터가 없는 경우', async () => {
      await expect(imageBoardService.getPatchDataService(0, member.userId))
        .rejects
        .toThrow(BadRequestException);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      await expect(imageBoardService.getPatchDataService(testBoard.id, 'noneUser'))
        .rejects
        .toThrow(AccessDeniedException);
    });
  });

  describe('patchImageBoardService', () => {
    const patchDTO: PatchImageBoardRequest = new PatchImageBoardRequest();
    patchDTO.title = 'patchTestTitle';
    patchDTO.content = 'patchTestContent';

    it('정상 처리. 추가할 이미지 파일과 삭제할 파일명 모두 포함', async () => {
      patchDTO.deleteFiles = [testBoardImageData[0].imageName];
      const req = getReq();

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(req.files[0].filename);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const result: number = await imageBoardService.patchImageBoardService(testBoard.id, patchDTO, req.files, member.id);

      expect(result).toBe(testBoard.id);
      expect(resizingService.resizeBoardImage).toHaveBeenCalledTimes(req.files.length);
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: result } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: result } });
      const patchImageDataNames: string[] = patchImageData.map(entity => entity.imageName);
      const imageDataSize: number = testBoardImageData.length - patchDTO.deleteFiles.length + req.files.length;

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(imageDataSize);
      patchDTO.deleteFiles.forEach(deleteName => expect(patchImageDataNames.includes(deleteName)).toBeFalsy());
      req.files.forEach(file =>
        expect(patchImageDataNames.includes(file.filename)).toBeTruthy()
      );
    });

    it('정상 처리. 파일 추가 없이 삭제와 데이터 갱신', async () => {
      const user = getReq().user;
      const req: any = { user };
      patchDTO.deleteFiles = [testBoardImageData[0].imageName];

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const result: number = await imageBoardService.patchImageBoardService(testBoard.id, patchDTO, req.files, member.id);

      expect(result).toBe(testBoard.id);
      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: result } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: result } });
      const patchImageDataNames: string[] = patchImageData.map(entity => entity.imageName);
      const imageDataSize: number = testBoardImageData.length - patchDTO.deleteFiles.length;

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(imageDataSize);
      patchDTO.deleteFiles.forEach(deleteName => expect(patchImageDataNames.includes(deleteName)).toBeFalsy());
    });

    it('파일 추가로 인해 5장이 넘어가는 경우', async () => {
      const fileReq: any = {
        files: [
          { filename: 'file1.png', originalname: 'file1OldName.png' },
          { filename: 'file2.png', originalname: 'file2OldName.png' },
          { filename: 'file3.png', originalname: 'file3OldName.png' },
        ],
      }
      patchDTO.deleteFiles = undefined;

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.id, patchDTO, fileReq.files, member.id))
        .rejects
        .toThrow(TooManyFilesException);

      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
    });

    it('파일 추가 없이 모든 파일을 삭제하는 요청인 경우', async () => {
      const user = getReq().user;
      const req: any = { user };
      patchDTO.deleteFiles = testBoardImageData.map(data => data.imageName);

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.id, patchDTO, req.files, member.id))
        .rejects
        .toThrow(BadRequestException);

      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('삭제할 파일명 중 해당 게시글의 파일명이 아닌 경우', async () => {
      const req = getReq();
      patchDTO.deleteFiles = ['wrongFileName.png'];

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.id, patchDTO, req.files, member.id))
        .rejects
        .toThrow(BadRequestException);

      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
    });

    it('삭제할 파일명 중 해당 게시글의 파일명이 아니고 추가하는 파일이 없는 경우', async () => {
      const user = getReq().user;
      const req: any = { user };
      patchDTO.deleteFiles = ['wrongFileName.png'];

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.patchImageBoardService(testBoard.id, patchDTO, req.files, member.id))
        .rejects
        .toThrow(BadRequestException);

      expect(resizingService.resizeBoardImage).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('삭제 요청된 파일 처리 중 오류가 발생하는 경우', async () => {
      const req = getReq();
      patchDTO.deleteFiles = [testBoardImageData[0].imageName];

      (resizingService.resizeBoardImage as jest.Mock)
        .mockResolvedValue(req.files[0].filename);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });

      const result: number = await imageBoardService.patchImageBoardService(testBoard.id, patchDTO, req.files, member.id);

      expect(result).toBeDefined();
      expect(result).toBe(testBoard.id);

      expect(resizingService.resizeBoardImage).toHaveBeenCalledTimes(req.files.length);
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: result } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: result } });
      const patchImageDataNames: string[] = patchImageData.map(entity => entity.imageName);
      const imageDataSize: number = testBoardImageData.length - patchDTO.deleteFiles.length + req.files.length;

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(imageDataSize);
      patchDTO.deleteFiles.forEach(deleteName => expect(patchImageDataNames.includes(deleteName)).toBeFalsy());
      req.files.forEach(file => {
        expect(patchImageDataNames.includes(file.filename)).toBeTruthy()
      });
    })
  });

  describe('deleteImageBoard', () => {
    it('정상 처리.', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await imageBoardService.deleteImageBoard(testBoard.id, member.id);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: testBoard.id } });
      expect(deleteBoard).toBeNull();

      const deleteImageData: ImageData[] | null = await imageDataRepository.find({ where: { imageId: testBoard.id } });
      expect(deleteImageData).toStrictEqual([]);
    });

    it('작성자가 일치하지 않는 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.deleteImageBoard(testBoard.id, 2))
        .rejects
        .toThrow(AccessDeniedException);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: testBoard.id } });
      expect(deleteBoard).not.toBeNull();

      const deleteImageData: ImageData[] | null = await imageDataRepository.find({ where: { imageId: testBoard.id } });
      expect(deleteImageData).not.toStrictEqual([]);
    });

    it('데이터가 없는 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(imageBoardService.deleteImageBoard(0, member.id))
        .rejects
        .toThrow(BadRequestException);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
    });

    it('파일 삭제에서 오류가 발생한 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });

      await imageBoardService.deleteImageBoard(testBoard.id, member.id);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: testBoard.id } });
      expect(deleteBoard).toBeNull();

      const deleteImageData: ImageData[] | null = await imageDataRepository.find({ where: { imageId: testBoard.id } });
      expect(deleteImageData).toStrictEqual([]);
    })
  });
});