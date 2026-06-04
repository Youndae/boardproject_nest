let resizeMock: jest.Mock;
let toFileMock: jest.Mock;

jest.mock('sharp', () => {
  resizeMock = jest.fn().mockReturnThis(),
    toFileMock = jest.fn().mockResolvedValue({});

  return () => ({ resize: resizeMock, toFile: toFileMock });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisClientType } from 'redis';
import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { MemberRepository } from '#member/repositories/member.repository';
import { AuthRepository } from '#member/repositories/auth.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ConfigService } from '@nestjs/config';
import { TestTokenUtil } from '../../utils/testToken.util';
import { Member } from '#member/entities/member.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '#src/app.module';
import { FileService } from '#src/file/service/file.service';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import cookieParser from 'cookie-parser';
import { Auth } from '#member/entities/auth.entity';
import request from 'supertest';
import { keywordLengthMessage } from '#common/constants/common-validate-message.constants';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '#common/interceptor/transform.interceptor';
import { ApiResponse } from '#common/dtos/out/api.response.dto';
import { ImageBoardListResponse } from '#imageBoard/dtos/out/image-board-list.response.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { getTotalPages } from '../../utils/pagination.utils';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { ImageBoardPatchDetailResponse } from '#imageBoard/dtos/out/image-board-patch-detail.response.dto';

describe('ImageBoardController E2E Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redisClient: RedisClientType;
  let configService: ConfigService;
  let fileService: FileService;
  
  let memberRepository: MemberRepository;
  let authRepository: AuthRepository;
  let imageBoardRepository: ImageBoardRepository;
  let imageDataRepository: ImageDataRepository;

  let tokenProvider: JWTTokenProvider;
  let tokenUtil: TestTokenUtil;
  
  const baseUrl = '/image-board';
  
  const firstMember: Member = new Member();
  const secondMember: Member = new Member();
  
  let testBoard: ImageBoard;
  let testBoardImageData: ImageData[];
  const boardListCount: number = 20;
  const boardAmount: number = 15;
  const anonymousId = 'Anonymous';
  
  beforeAll(async () => {
    initializeTransactionalContext();
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(FileService)
      .useValue({ deleteBoardFiles: jest.fn() })
      .compile();
    
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    imageBoardRepository = moduleFixture.get<ImageBoardRepository>(ImageBoardRepository);
    imageDataRepository = moduleFixture.get<ImageDataRepository>(ImageDataRepository);
    
    fileService = moduleFixture.get<FileService>(FileService);

    tokenProvider = moduleFixture.get<JWTTokenProvider>(JWTTokenProvider);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    redisClient = moduleFixture.get<RedisClientType>(REDIS_CLIENT);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    tokenUtil = new TestTokenUtil(tokenProvider, configService);
    
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
      })
    )
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    
    await app.init();

    firstMember.userId = 'tester';
    firstMember.password = '1234';
    firstMember.username = 'testerName';
    firstMember.nickname = 'testerNickname';
    firstMember.email = 'tester@tester.com';
    firstMember.profile = 'testProfileThumbnail.png';
    firstMember.provider = 'local';

    secondMember.userId = 'tester2';
    secondMember.password = '1234';
    secondMember.username = 'testerName2';
    secondMember.nickname = 'testerNickname2';
    secondMember.email = 'tester2@tester.com';
    secondMember.profile = 'testProfileThumbnail2.png';
    secondMember.provider = 'local';

    const saveMembers: Member[] = [firstMember, secondMember];
    const savedMembers: Member[] = await memberRepository.save(saveMembers);
    firstMember.id = savedMembers[0].id;
    secondMember.id = savedMembers[1].id;

    const memberRole: string = 'ROLE_MEMBER';
    const saveAuths: Auth[] = [
      authRepository.create({
        userId: firstMember.id,
        auth: memberRole
      }),
      authRepository.create({
        userId: secondMember.id,
        auth: memberRole
      })
    ];

    await authRepository.save(saveAuths);
  })
  
  beforeEach(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();

    const imageBoardArr: ImageBoard[] = [];
    const imageDataArr: ImageData[] = [];

    for(let i  = 0; i < boardListCount; i++) {
      imageBoardArr.push(
        imageBoardRepository.create({
          userId: firstMember.id,
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
            imageName: `board/${saveBoard.title}'sImage${i}.jpg`,
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
  });
  
  afterEach(async () => {
    if(redisClient?.isOpen)
      await redisClient.flushAll();

    jest.clearAllMocks();
  })

  afterAll(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    await dataSource.destroy();
    await app.close();
  });

  describe('GET /', () => {
    it('정상 조회. Query 없는 요청', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. Query 없는 요청. 로그인 한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. page만 2로 요청하는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'page': 2 })
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      const page2Elements = Math.min((boardListCount - boardAmount), boardAmount);

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(page2Elements);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(2);
    });

    it('데이터가 없는 경우', async () => {
      await imageDataRepository.deleteAll();
      await imageBoardRepository.deleteAll();

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(0);
      expect(content?.isEmpty).toBeTruthy();
      expect(content?.totalPages).toBe(0);
      expect(content?.currentPage).toBe(1);
    })

    it('정상 조회. 제목 기반 조회. 페이지 값은 undefined', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': '11'})
        .query({ 'searchType': 't' })
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(1);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(1);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. 내용 기반 조회. 페이지 값은 undefined', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': '11'})
        .query({ 'searchType': 'c' })
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(1);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(1);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. 제목 or 내용 기반 조회. 페이지 값은 undefined', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': '11'})
        .query({ 'searchType': 'tc' })
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(1);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(1);
      expect(content?.currentPage).toBe(1);
    });

    it('정상 조회. 작성자 기반 조회. 페이지 2', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': `${firstMember.userId}`})
        .query({ 'searchType': 'u' })
        .query({ 'page': '2'})
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;

      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);
      const page2Elements = Math.min((boardListCount - boardAmount), boardAmount);

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(page2Elements);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(2);
    });

    it('검색어가 1글자인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '1' })
        .query({ 'searchType': 't'})
        .expect(400);

      const body = response.body;

      expect(body.message[0]).toBe(keywordLengthMessage);
    });

    it('검색 타입이 정의된 타입이 아닌 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 'a'})
        .expect(400);

      const body = response.body;

      expect(body.message[0]).toBe('searchType must be one of the following values: t, c, tc, u');
    });

    it('페이지 번호가 문자열 타입으로 전달 되는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'page': '1'})
        .expect(200);

      const body: ApiResponse<ListResponse<ImageBoardListResponse>> = response.body;
      expect(body.code).toBe(200);
      const content: ListResponse<ImageBoardListResponse> | null = body.content;
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(content).not.toBeNull();
      expect(content?.items.length).toBe(boardAmount);
      expect(content?.isEmpty).toBeFalsy();
      expect(content?.totalPages).toBe(totalPageFixture);
      expect(content?.currentPage).toBe(1);
    })
  });

  describe('GET /:id', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${testBoard.id}`)
        .expect(200);

      const body: ApiResponse<ImageBoardDetailResponse> = response.body;
      expect(body.code).toBe(200);
      const content: ImageBoardDetailResponse | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.title).toBe(testBoard.title);
      expect(content?.content).toBe(testBoard.content);
      expect(content?.writer).toBe(firstMember.nickname);
      expect(content?.writerId).toBe(firstMember.userId);
      expect(content?.createdAt).toBeDefined();
      expect(content?.imageDataList.length).toBe(testBoardImageData.length);

      for(let i = 0; i < testBoardImageData.length; i++){
        const contentImage = content!.imageDataList[i];
        const fixtureImage = testBoardImageData[i];

        expect(contentImage).toBe(fixtureImage.imageName);
      }
    });

    it('정상 조회. 로그인 한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<ImageBoardDetailResponse> = response.body;
      expect(body.code).toBe(200);
      const content: ImageBoardDetailResponse | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.title).toBe(testBoard.title);
      expect(content?.content).toBe(testBoard.content);
      expect(content?.writer).toBe(firstMember.nickname);
      expect(content?.writerId).toBe(firstMember.userId);
      expect(content?.createdAt).toBeDefined();
      expect(content?.imageDataList.length).toBe(testBoardImageData.length);

      for(let i = 0; i < testBoardImageData.length; i++){
        const contentImage = content!.imageDataList[i];
        const fixtureImage = testBoardImageData[i];

        expect(contentImage).toBe(fixtureImage.imageName);
      }
    });

    it('데이터가 없는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/0`)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });
  });

  describe('POST /', () => {
    const postDTO = {
      title: 'testPostTitle',
      content: 'testPostContent'
    }
    it('정상 처리', async() => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('title', postDTO.title)
        .field('content', postDTO.content)
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(201);


      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();

      const saveId: number | null = response.body.content;
      expect(saveId).not.toBeNull();

      const saveBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: saveId! } });

      expect(saveBoard).not.toBeNull();
      expect(saveBoard?.title).toBe(postDTO.title);
      expect(saveBoard?.content).toBe(postDTO.content);
      expect(saveBoard?.userId).toBe(firstMember.id);
      expect(saveBoard?.createdAt).toBeDefined();

      const saveImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: saveId! }, order: { 'imageStep': 'ASC' } });

      expect(saveImageData).not.toStrictEqual([]);
      expect(saveImageData.length).toBe(3);
      saveImageData.forEach(entity => {
        expect(entity.originName.startsWith('testImage')).toBeTruthy();
      })
    });

    it('비회원 접근', async () => {
      toFileMock.mockResolvedValueOnce({});

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .field('title', postDTO.title)
        .field('content', postDTO.content)
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('제목이 1글자인 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('title', 't')
        .field('content', postDTO.content)
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);


      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle must be longer than or equal to 2 characters')
    });

    it('제목 필드가 없는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('content', postDTO.content)
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle should not be null or undefined')
    });

    it('내용 필드가 없는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('title', postDTO.title)
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent should not be null or undefined')
    });

    it('내용 필드가 blank인 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('title', postDTO.title)
        .field('content', '')
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent is not empty')
    });

    it('파일이 하나도 없는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('title', postDTO.title)
        .field('content', postDTO.content)
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('At least one image is required');
    });
  });

  describe('GET /patch/detail/:id', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch/detail/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<ImageBoardPatchDetailResponse> = response.body
      expect(body.code).toBe(200);
      const content: ImageBoardPatchDetailResponse | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.title).toBe(testBoard.title);
      expect(content?.content).toBe(testBoard.content);

      const imageNamesFixture: string[] = testBoardImageData.map(entity => entity.imageName);
      content?.imageList.forEach(name => expect(imageNamesFixture.includes(name.imageName)).toBeTruthy());
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch/detail/${testBoard.id}`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch/detail/0`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    })

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch/detail/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    })
  });

  describe('PATCH /:id', () => {
    const patchDTO = {
      title: 'patchTestTitle',
      content: 'patchTestContent'
    }
    it('정상 처리. 모든 데이터 포함', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const maxImageStep: number = testBoardImageData[testBoardImageData.length - 1].imageStep;
      const fileCount: number = testBoardImageData.length - imageNameFixtures.length + 1;
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(200);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      const responseId: number = response.body.content;

      expect(responseId).toBeDefined();

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: responseId } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);
      expect(patchBoard?.userId).toBe(firstMember.id);
      expect(patchBoard?.createdAt).toStrictEqual(testBoard.createdAt);


      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: responseId }, order: { 'imageStep': 'ASC' } });

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(fileCount);

      expect(patchImageData[0].imageName).toBe(testBoardImageData[testBoardImageData.length - 1].imageName);

      const newImageData: ImageData = patchImageData[1];

      expect(newImageData.originName).toBe('patchImage1.jpg');
      expect(newImageData.imageStep).toBe(maxImageStep + 1);
    });

    it('정상 처리. 파일 추가 제외 모든 데이터 포함', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const fileCount: number = testBoardImageData.length - imageNameFixtures.length;
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', imageNameFixtures)
        .expect(200);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      const responseId: number = response.body.content;

      expect(responseId).toBeDefined();

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: responseId } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: responseId }, order: { 'imageStep': 'ASC' } });

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(fileCount);

      expect(patchImageData[0].imageName).toBe(testBoardImageData[testBoardImageData.length - 1].imageName);
    });

    it('정상 처리. 파일 추가 및 제거 제외 게시글 데이터만 포함', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .expect(200);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      const responseId: number = response.body.content;

      expect(responseId).toBeDefined();

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: responseId } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.title).toBe(patchDTO.title);
      expect(patchBoard?.content).toBe(patchDTO.content);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: responseId }, order: { 'imageStep': 'ASC' } });

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(testBoardImageData.length);
    });

    it('비회원 요청', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(403);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('제목이 1글자인 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', 't')
        .field('content', patchDTO.content)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle must be longer than or equal to 2 characters');
    });

    it('제목이 없는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('content', patchDTO.content)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', '')
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent is not empty');
    });

    it('내용이 없는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent should not be null or undefined');
    });

    it('작성자가 아닌 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(403);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    });

    it('파일을 삭제하지 않고 추가만 하는데 기존 포함 5장 이상이 된 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage2.jpg'
        )
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage3.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      expect(response.body.message).toBe(ResponseStatusConstants.TOO_MANY_FILES.MESSAGE);
    });

    it('파일을 추가하지 않고 모든 파일을 삭제하는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const deleteImageNames: string[] = testBoardImageData.map(entity => entity.imageName);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', deleteImageNames)
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('제거하는 파일 중 기존 파일명과 다른 파일이 있는 경우', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const deleteImageNames: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 1);
      deleteImageNames.push('wrongFilename.jpg');
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', deleteImageNames)
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    })

    it('제거하는 파일 중 기존 파일명과 다른 파일이 있는 경우. 파일 추가 포함', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const deleteImageNames: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 1);
      deleteImageNames.push('wrongFilename.jpg');
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .field('title', patchDTO.title)
        .field('content', patchDTO.content)
        .field('deleteFiles', deleteImageNames)
        .attach(
          'files',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    })
  });

  describe('DELETE /:imageNo', () => {
    it('정상 처리', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(204);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { id: testBoard.id } });
      expect(deleteBoard).toBeNull();

      const deleteImageData: ImageData[] = await imageDataRepository.find({ where: { imageId: testBoard.id } });
      expect(deleteImageData).toStrictEqual([]);
    });

    it('작성자가 아닌 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.id}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe(ResponseStatusConstants.ACCESS_DENIED.MESSAGE);
    });

    it('데이터가 없는 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/0`)
        .set('Cookie', tokenCookies)
        .expect(400);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });
  });
});
