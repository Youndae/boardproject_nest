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
    
  });
});