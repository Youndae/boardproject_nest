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
import { FileService } from '#common/services/file.service';
import { ResizingService } from '#common/services/resizing.service';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import cookieParser from 'cookie-parser';
import { Auth } from '#member/entities/auth.entity';
import request from 'supertest';

describe('ImageBoardController E2E Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redisClient: RedisClientType;
  let configService: ConfigService;
  let fileService: FileService;
  let resizingService: ResizingService;
  
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
      .overrideProvider(ResizingService)
      .useValue({ resizeBoardImages: jest.fn() })
      .overrideProvider(FileService)
      .useValue({ deleteBoardFiles: jest.fn() })
      .compile();
    
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    imageBoardRepository = moduleFixture.get<ImageBoardRepository>(ImageBoardRepository);
    imageDataRepository = moduleFixture.get<ImageDataRepository>(ImageDataRepository);
    
    fileService = moduleFixture.get<FileService>(FileService);
    resizingService = moduleFixture.get<ResizingService>(ResizingService);

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
    
    await app.init();

    firstMember.userId = 'tester';
    firstMember.userPw = '1234';
    firstMember.userName = 'testerName';
    firstMember.nickName = 'testerNickname';
    firstMember.email = 'tester@tester.com';
    firstMember.profileThumbnail = 'testProfileThumbnail.png';
    firstMember.provider = 'local';

    secondMember.userId = 'tester2';
    secondMember.userPw = '1234';
    secondMember.userName = 'testerName2';
    secondMember.nickName = 'testerNickname2';
    secondMember.email = 'tester2@tester.com';
    secondMember.profileThumbnail = 'testProfileThumbnail2.png';
    secondMember.provider = 'local';

    const saveMembers: Member[] = [firstMember, secondMember];
    const memberRole: string = 'ROLE_MEMBER';
    const saveAuths: Auth[] = [
      authRepository.create({
        userId: firstMember.userId,
        auth: memberRole
      }),
      authRepository.create({
        userId: secondMember.userId,
        auth: memberRole
      })
    ];

    await memberRepository.save(saveMembers);
    await authRepository.save(saveAuths);
  })
  
  beforeEach(async () => {
    jest.clearAllMocks();

    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();

    const imageBoardArr: ImageBoard[] = [];
    const imageDataArr: ImageData[] = [];

    for(let i  = 0; i < boardListCount; i++) {
      imageBoardArr.push(
        imageBoardRepository.create({
          userId: firstMember.userId,
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
  });
  
  afterEach(async () => {
    if(redisClient?.isOpen)
      await redisClient.flushAll();
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

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. Query 없는 요청. 로그인 한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
    });

    it('정상 조회. page만 2로 요청하는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'pageNum': 2 })
        .expect(200);

      const body = response.body;

      const page2Elements = Math.min((boardListCount - boardAmount), boardAmount);

      expect(body).toBeDefined();
      expect(body.content.length).toBe(page2Elements);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('데이터가 없는 경우', async () => {
      await imageDataRepository.deleteAll();
      await imageBoardRepository.deleteAll();

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(0);
      expect(body.empty).toBeTruthy();
      expect(body.totalElements).toBe(0);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    })

    it('정상 조회. 제목 기반 조회. 페이지 값은 undefined', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': '11'})
        .query({ 'searchType': 't' })
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(1);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(1);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. 내용 기반 조회. 페이지 값은 undefined', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': '11'})
        .query({ 'searchType': 'c' })
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(1);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(1);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. 제목 or 내용 기반 조회. 페이지 값은 undefined', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': '11'})
        .query({ 'searchType': 'tc' })
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(1);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(1);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('정상 조회. 작성자 기반 조회. 페이지 2', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/`)
        .query({ 'keyword': `${firstMember.userId}`})
        .query({ 'searchType': 'u' })
        .query({ 'pageNum': '2'})
        .expect(200);

      const body = response.body;

      const page2Elements = Math.min((boardListCount - boardAmount), boardAmount);

      expect(body).toBeDefined();
      expect(body.content.length).toBe(page2Elements);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    });

    it('검색어가 1글자인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '1' })
        .query({ 'searchType': 't'})
        .expect(400);

      const body = response.body;

      expect(body.message[0]).toBe('boardTitle must be longer than or equal to 2 characters');
      expect(body.error).toBe('Bad Request');
    });

    it('검색 타입이 정의된 타입이 아닌 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'keyword': '11' })
        .query({ 'searchType': 'a'})
        .expect(400);

      const body = response.body;

      expect(body.message[0]).toBe('searchType must be one of the following values: t, c, tc, u');
      expect(body.error).toBe('Bad Request');
    });

    it('페이지 번호가 문자열 타입으로 전달 되는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}`)
        .query({ 'pageNum': '1'})
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.content.length).toBe(boardAmount);
      expect(body.empty).toBeFalsy();
      expect(body.totalElements).toBe(boardListCount);
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
    })
  });

  describe('GET /:imageNo', () => {
    it('정상 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${testBoard.imageNo}`)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.userStatus.loggedIn).toBeFalsy();
      expect(body.userStatus.uid).toBe(anonymousId);
      const content = body.content;
      expect(content.imageNo).toBe(testBoard.imageNo);
      expect(content.imageTitle).toBe(testBoard.imageTitle);
      expect(content.imageContent).toBe(testBoard.imageContent);
      expect(content.userId).toBe(testBoard.userId);
      expect(content.imageDate).toBeDefined();
      expect(content.imageData.length).toBe(testBoardImageData.length);

      for(let i = 0; i < testBoardImageData.length; i++){
        const contentImage = content.imageData[i];
        const fixtureImage = testBoardImageData[i];

        expect(contentImage.imageName).toBe(fixtureImage.imageName);
        expect(contentImage.oldName).toBe(fixtureImage.oldName);
        expect(contentImage.imageStep).toBe(fixtureImage.imageStep);
      }
    });

    it('정상 조회. 로그인 한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body = response.body;

      expect(body).toBeDefined();
      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
      const content = body.content;
      expect(content.imageNo).toBe(testBoard.imageNo);
      expect(content.imageTitle).toBe(testBoard.imageTitle);
      expect(content.imageContent).toBe(testBoard.imageContent);
      expect(content.userId).toBe(testBoard.userId);
      expect(content.imageDate).toBeDefined();
      expect(content.imageData.length).toBe(testBoardImageData.length);

      for(let i = 0; i < testBoardImageData.length; i++){
        const contentImage = content.imageData[i];
        const fixtureImage = testBoardImageData[i];

        expect(contentImage.imageName).toBe(fixtureImage.imageName);
        expect(contentImage.oldName).toBe(fixtureImage.oldName);
        expect(contentImage.imageStep).toBe(fixtureImage.imageStep);
      }
    });

    it('데이터가 없는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/0`)
        .expect(404);

      expect(response.body.message).toBe('NOT_FOUND');
    });
  });

  describe('POST /', () => {
    const postDTO = {
      imageTitle: 'testPostTitle',
      imageContent: 'testPostContent'
    }
    it('정상 처리', async() => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', postDTO.imageTitle)
        .field('imageContent', postDTO.imageContent)
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(201);

      expect(resizingService.resizeBoardImages).toHaveBeenCalledTimes(1);
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();

      const saveNo: number = response.body.imageNo;

      const saveBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: saveNo } });

      expect(saveBoard).not.toBeNull();
      expect(saveBoard?.imageTitle).toBe(postDTO.imageTitle);
      expect(saveBoard?.imageContent).toBe(postDTO.imageContent);
      expect(saveBoard?.userId).toBe(firstMember.userId);
      expect(saveBoard?.imageDate).toBeDefined();

      const saveImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: saveNo }, order: { 'imageStep': 'ASC' } });

      expect(saveImageData).not.toStrictEqual([]);
      expect(saveImageData.length).toBe(3);
      saveImageData.forEach(entity => {
        expect(entity.imageName.startsWith('board/')).toBeTruthy();
        expect(entity.oldName.startsWith('testImage')).toBeTruthy();
      })
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .field('imageTitle', postDTO.imageTitle)
        .field('imageContent', postDTO.imageContent)
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(403);

      expect(response.body.message).toBe('FORBIDDEN');
    });

    it('제목이 1글자인 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', 't')
        .field('imageContent', postDTO.imageContent)
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle must be longer than or equal to 2 characters')
    });

    it('제목 필드가 없는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageContent', postDTO.imageContent)
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle should not be null or undefined')
    });

    it('내용 필드가 없는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', postDTO.imageTitle)
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent should not be null or undefined')
    });

    it('내용 필드가 blank인 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', postDTO.imageTitle)
        .field('imageContent', '')
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent is not empty')
    });

    it('파일이 하나도 없는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', postDTO.imageTitle)
        .field('imageContent', postDTO.imageContent)
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('At least one image is required');
    });

    it('리사이징에서 오류가 발생한 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockImplementationOnce(() => { throw new Error(); });
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', postDTO.imageTitle)
        .field('imageContent', postDTO.imageContent)
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'testImage3.jpg'
        )
        .expect(500);

      expect(resizingService.resizeBoardImages).toHaveBeenCalledTimes(1);
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      expect(response.body.message).toBe('Internal server error');
    })
  });

  describe('GET /patch-detail/:imageNo', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body = response.body

      expect(body).toBeDefined();
      expect(body.content.imageNo).toBe(testBoard.imageNo);
      expect(body.content.imageTitle).toBe(testBoard.imageTitle);
      expect(body.content.imageContent).toBe(testBoard.imageContent);

      const imageNamesFixture: string[] = testBoardImageData.map(entity => entity.imageName);
      body.content.imageData.forEach(name => expect(imageNamesFixture.includes(name)).toBeTruthy());

      expect(body.userStatus.loggedIn).toBeTruthy();
      expect(body.userStatus.uid).toBe(firstMember.userId);
    });

    it('비회원 접근', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.imageNo}`)
        .expect(403);

      expect(response.body.message).toBe('FORBIDDEN');
    });

    it('데이터가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/0`)
        .set('Cookie', tokenCookies)
        .expect(404);

      expect(response.body.message).toBe('NOT_FOUND');
    })

    it('작성자가 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/patch-detail/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe('ACCESS_DENIED');
    })
  });

  describe('PATCH /:imageNo', () => {
    const patchDTO = {
      imageTitle: 'patchTestTitle',
      imageContent: 'patchTestContent'
    }
    it('정상 처리. 모든 데이터 포함', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const maxImageStep: number = testBoardImageData[testBoardImageData.length - 1].imageStep;
      const fileCount: number = testBoardImageData.length - imageNameFixtures.length + 1;
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(200);

      expect(resizingService.resizeBoardImages).toHaveBeenCalledTimes(1);
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      const patchImageNo: number = response.body.imageNo;

      expect(patchImageNo).toBeDefined();

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: patchImageNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.imageTitle).toBe(patchDTO.imageTitle);
      expect(patchBoard?.imageContent).toBe(patchDTO.imageContent);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: patchImageNo }, order: { 'imageStep': 'ASC' } });

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(fileCount);

      expect(patchImageData[0].imageName).toBe(testBoardImageData[testBoardImageData.length - 1].imageName);

      const newImageData: ImageData = patchImageData[1];

      expect(newImageData.imageName.startsWith('board/')).toBeTruthy();
      expect(newImageData.oldName).toBe('patchImage1.jpg');
      expect(newImageData.imageStep).toBe(maxImageStep + 1);
    });

    it('정상 처리. 파일 추가 제외 모든 데이터 포함', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const fileCount: number = testBoardImageData.length - imageNameFixtures.length;
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', imageNameFixtures)
        .expect(200);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      const patchImageNo: number = response.body.imageNo;

      expect(patchImageNo).toBeDefined();

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: patchImageNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.imageTitle).toBe(patchDTO.imageTitle);
      expect(patchBoard?.imageContent).toBe(patchDTO.imageContent);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: patchImageNo }, order: { 'imageStep': 'ASC' } });

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(fileCount);

      expect(patchImageData[0].imageName).toBe(testBoardImageData[testBoardImageData.length - 1].imageName);
    });

    it('정상 처리. 파일 추가 및 제거 제외 게시글 데이터만 포함', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .expect(200);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      const patchImageNo: number = response.body.imageNo;

      expect(patchImageNo).toBeDefined();

      const patchBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: patchImageNo } });

      expect(patchBoard).not.toBeNull();
      expect(patchBoard?.imageTitle).toBe(patchDTO.imageTitle);
      expect(patchBoard?.imageContent).toBe(patchDTO.imageContent);

      const patchImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: patchImageNo }, order: { 'imageStep': 'ASC' } });

      expect(patchImageData).not.toStrictEqual([]);
      expect(patchImageData.length).toBe(testBoardImageData.length);
    });

    it('비회원 요청', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(403);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('FORBIDDEN');
    });

    it('제목이 1글자인 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', 't')
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle must be longer than or equal to 2 characters');
    });

    it('제목이 없는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageTitle should not be null or undefined');
    });

    it('내용이 blank인 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', '')
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent is not empty');
    });

    it('내용이 없는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message[0]).toBe('imageContent should not be null or undefined');
    });

    it('작성자가 아닌 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);
      const imageNameFixtures: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 2);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', imageNameFixtures)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(403);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('ACCESS_DENIED');
    });

    it('파일을 삭제하지 않고 추가만 하는데 기존 포함 5장 이상이 된 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage2.jpg'
        )
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage3.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      expect(response.body.message).toBe('TOO_MANY_FILES');
    });

    it('파일을 추가하지 않고 모든 파일을 삭제하는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const deleteImageNames: string[] = testBoardImageData.map(entity => entity.imageName);
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', deleteImageNames)
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('BAD_REQUEST');
    });

    it('제거하는 파일 중 기존 파일명과 다른 파일이 있는 경우', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const deleteImageNames: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 1);
      deleteImageNames.push('wrongFilename.jpg');
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', deleteImageNames)
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('BAD_REQUEST');
    })

    it('제거하는 파일 중 기존 파일명과 다른 파일이 있는 경우. 파일 추가 포함', async () => {
      (resizingService.resizeBoardImages as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);
      const deleteImageNames: string[] = testBoardImageData.map(entity => entity.imageName).slice(0, 1);
      deleteImageNames.push('wrongFilename.jpg');
      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .field('imageTitle', patchDTO.imageTitle)
        .field('imageContent', patchDTO.imageContent)
        .field('deleteFiles', deleteImageNames)
        .attach(
          'images',
          Buffer.from('fake'),
          'patchImage1.jpg'
        )
        .expect(400);

      expect(resizingService.resizeBoardImages).not.toHaveBeenCalled();
      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);
      expect(response.body.message).toBe('BAD_REQUEST');
    })
  });

  describe('DELETE /:imageNo', () => {
    it('정상 처리', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .expect(204);

      expect(fileService.deleteBoardFiles).toHaveBeenCalledTimes(1);

      const deleteBoard: ImageBoard | null = await imageBoardRepository.findOne({ where: { imageNo: testBoard.imageNo } });
      expect(deleteBoard).toBeNull();

      const deleteImageData: ImageData[] = await imageDataRepository.find({ where: { imageNo: testBoard.imageNo } });
      expect(deleteImageData).toStrictEqual([]);
    });

    it('작성자가 아닌 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(secondMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${testBoard.imageNo}`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('ACCESS_DENIED');
    });

    it('데이터가 없는 경우', async () => {
      (fileService.deleteBoardFiles as jest.Mock)
        .mockResolvedValue(undefined);
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(firstMember.userId);

      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/0`)
        .set('Cookie', tokenCookies)
        .expect(404);

      expect(fileService.deleteBoardFiles).not.toHaveBeenCalled();
      expect(response.body.message).toBe('NOT_FOUND');
    });
  });
});