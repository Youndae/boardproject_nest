import { MemberCheckConstants } from '#member/constants/member-check.constants';

let resizeMock: jest.Mock;
let toFileMock: jest.Mock;

jest.mock('sharp', () => {
  resizeMock = jest.fn().mockReturnThis(),
  toFileMock = jest.fn().mockResolvedValue({});

  return () => ({ resize: resizeMock, toFile: toFileMock });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '#src/app.module';
import { JWTTokenProvider } from '#auth/services/jwt-token.provider';
import { initializeTransactionalContext } from 'typeorm-transactional';
import request from 'supertest'
import cookieParser from 'cookie-parser';
import { MemberRepository } from '#member/repositories/member.repository';
import { AuthRepository } from '#member/repositories/auth.repository';
import { DataSource } from 'typeorm';
import { FileService } from '#src/file/service/file.service';
import { ConfigService } from '@nestjs/config';
import { Member } from '#member/entities/member.entity';
import { Auth } from '#member/entities/auth.entity';
import { TestTokenUtil } from '../../utils/testToken.util';
import bcrypt from 'bcrypt';
import { ResponseStatusConstants, UserAlreadyExistsConstants } from '#common/constants/response-status.constants';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import type { RedisClientType } from 'redis';
import { TransformInterceptor } from '#common/interceptor/transform.interceptor';
import { ApiResponse } from '#common/dtos/out/api.response.dto';
import { MemberStatusResponse } from '#member/dtos/out/member-status.response.dto';
import { JoinRequest } from '#member/dtos/in/join.request.dto';
import { Reflector } from '@nestjs/core';
import { ProfileResponse } from '#member/dtos/out/profile.response.dto';
import { MemberMailConstants } from '#member/constants/member-mail.constants';

describe('MemberController E2E Test', () => {
  let app: INestApplication;
  let tokenProvider: JWTTokenProvider;
  let memberRepository: MemberRepository;
  let authRepository: AuthRepository;
  let dataSource: DataSource;
  let redisClient: RedisClientType;

  let fileService: FileService;
  let configService: ConfigService;

  const baseUrl = '/member';

  let destDir: string;

  const memberRole: string = 'ROLE_MEMBER';
  const saveMember: Member = new Member();
  const testProfileThumbnail: string = 'testProfile.png';

  let tokenUtil:TestTokenUtil;

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FileService)
      .useValue({ deleteFile: jest.fn() })
      .compile();

    tokenProvider = moduleFixture.get<JWTTokenProvider>(JWTTokenProvider);
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    redisClient = moduleFixture.get<RedisClientType>(REDIS_CLIENT);

    fileService = moduleFixture.get<FileService>(FileService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    destDir = configService.get<string>('PROFILE_FILE_PATH') ?? '';

    tokenUtil = new TestTokenUtil(tokenProvider, configService);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    await app.init();
  });

  beforeEach(async () => {
    // mockSharpResize.mockClear();
    // mockSharpToFormat.mockClear();
    // mockSharpToFile.mockClear();
    await memberRepository.deleteAll();

    saveMember.userId = 'tester';
    saveMember.password = '1234';
    saveMember.username = 'testerName';
    saveMember.nickname = 'testerNickname';
    saveMember.email = 'tester@tester.com';
    saveMember.profile = 'testProfileThumbnail.png';
    saveMember.provider = 'local';

    const savedMember: Member = await memberRepository.save(saveMember);
    saveMember.id = savedMember.id;

    const auth: Auth = authRepository.create({
      userId: saveMember.id,
      auth: memberRole
    });


    await authRepository.save(auth);

  });

  afterEach(async () => {
    if(redisClient?.isOpen)
      await redisClient.flushAll();

    jest.clearAllMocks();
  })

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  })


  describe('GET /status', () => {
    it('로그인 상태', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/status`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<MemberStatusResponse> = response.body;
      expect(body.code).toBe(200);
      const content: MemberStatusResponse | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.userId).toBe(saveMember.userId);
      expect(content?.role).toBe(memberRole);
    });

    it('비로그인 상태', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/status`)
        .expect(403);

      const body = response.body;

      expect(body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('권한이 여러개인 관리자의 경우', async() => {
      const auth: Auth = authRepository.create({
        userId: saveMember.id,
        auth: 'ROLE_ADMIN'
      });
      await authRepository.save(auth);

      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/status`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<MemberStatusResponse> = response.body;
      expect(body.code).toBe(200);
      const content: MemberStatusResponse | null = body.content;

      expect(content).not.toBeNull();
      expect(content?.userId).toBe(saveMember.userId);
      expect(content?.role).toBe('ROLE_ADMIN');
    })
  })

  describe('POST /register', () => {
    it('모든 데이터가 존재할 때', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .attach(
          'profile',
          Buffer.from('fake'),
          testProfileThumbnail
        )
        .expect(201);

      const saveMember: Member | null = await memberRepository.findOne({ where: { userId: joinDTO.userId } });

      expect(saveMember).toBeDefined();

      const passwordValid: boolean = await bcrypt.compare(joinDTO.password, saveMember!.password!);
      expect(passwordValid).toBeTruthy();

      expect(saveMember?.username).toBe(joinDTO.userName);
      expect(saveMember?.nickname).toBe(joinDTO.nickname);
      expect(saveMember?.email).toBe(joinDTO.email);
      expect(saveMember?.provider).toBe('local');
      expect(saveMember?.profile).toBeDefined();

      const profileThumbnailValid: boolean = saveMember!.profile!.endsWith('_300.jpg');
      expect(profileThumbnailValid).toBeTruthy();
    });

    it('프로필 이미지가 없을 때', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(201);

      const saveMember: Member | null = await memberRepository.findOne({ where: { userId: joinDTO.userId } });

      expect(saveMember).toBeDefined();

      const passwordValid: boolean = await bcrypt.compare(joinDTO.password, saveMember!.password!);
      expect(passwordValid).toBeTruthy();

      expect(saveMember?.username).toBe(joinDTO.userName);
      expect(saveMember?.nickname).toBe(joinDTO.nickname);
      expect(saveMember?.email).toBe(joinDTO.email);
      expect(saveMember?.provider).toBe('local');
      expect(saveMember?.profile).toBeNull();
    });

    it('비밀번호가 짧은 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'test1!',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('아이디가 한글자인 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 't',
        password: 'test1!',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('userName이 한글자인 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 't',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('닉네임이 한글자인 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: 't',
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('이메일 형식이 정상이 아닌 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2!tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('로그인한 사용자가 요청을 보낸 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .set('Cookie', tokenCookies)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('이미 존재하는 사용자 아이디로 요청한 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: 'tester2Nickname',
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', saveMember.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(409);

      expect(response.body.message).toBe(UserAlreadyExistsConstants.USER_ID.message);
    });

    it('이미 존재하는 닉네임으로 요청한 경우', async () => {
      const joinDTO: JoinRequest = {
        userId: 'tester2',
        password: 'testerpw12!@',
        userName: 'tester2Name',
        nickname: saveMember.nickname!,
        email: 'tester2@tester.com'
      };

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', joinDTO.userId)
        .field('password', joinDTO.password)
        .field('userName', joinDTO.userName)
        .field('nickname', joinDTO.nickname)
        .field('email', joinDTO.email)
        .expect(409);

      expect(response.body.message).toBe(UserAlreadyExistsConstants.NICKNAME.message);
    })
  });

  describe('GET /check-id/:userId', () => {
    it('중복이 아닌 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-id/noneUserId`)
        .expect(200);

      const body: ApiResponse<string> = response.body;

      expect(body.code).toBe(200);
      expect(body.content).toBe(MemberCheckConstants.SUCCESS);
    });

    it('중복인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-id/${saveMember.userId}`)
        .expect(409);

      expect(response.body.message).toBe(MemberCheckConstants.DUPLICATED);
    });

    it('query가 없는 경우', async () => {
      await request(app.getHttpServer())
        .get(`${baseUrl}/check-id`)
        .expect(404);
    });

    it('로그인 상태인 사용자가 요청한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-id/noneUserId`)
        .set('Cookie', tokenCookies)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    })
  });

  describe('GET /check-nickname/:nickname', () => {
    it('비회원이며 중복이 아닌 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname/noneNickname`)
        .expect(200);

      const body: ApiResponse<string> = response.body;
      expect(body.code).toBe(200);
      expect(body.content).toBe(MemberCheckConstants.SUCCESS);
    });

    it('비회원이며 중복인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname/${saveMember.nickname}`)
        .expect(409);

      expect(response.body.message).toBe(MemberCheckConstants.DUPLICATED);
    });

    it('nickname 쿼리가 없는 경우', async () => {
      await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .expect(404);
    });

    it('회원이며 중복이 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname/noneNickname`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<string> = response.body;
      expect(body.code).toBe(200);
      expect(body.content).toBe(MemberCheckConstants.SUCCESS);
    });

    it('회원이며 중복이지만 자신의 닉네임과 일치하는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname/${saveMember.nickname}`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<string> = response.body;
      expect(body.code).toBe(200);
      expect(body.content).toBe(MemberCheckConstants.SUCCESS);
    });

    it('회원이며 중복인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const newMember: Member = memberRepository.create({
        userId: 'tester2',
        password: 'tester2pw',
        username: 'testerName2',
        nickname: 'testerNickname2',
        email: 'tester2@tester.com',
        provider: 'local',
      });

      await memberRepository.save(newMember);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname/${newMember.nickname}`)
        .set('Cookie', tokenCookies)
        .expect(409);

      expect(response.body.message).toBe(MemberCheckConstants.DUPLICATED);
    });
  });

  describe('PATCH /profile', () => {
    it('닉네임과 수정 이미지, 삭제 이미지를 모두 포함한 요청인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchData = {
        nickname: 'patchNickname',
        deleteProfile: saveMember.profile!
      };

      await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .field('nickname', patchData.nickname)
        .field('deleteProfile', patchData.deleteProfile)
        .attach(
          'profile',
          Buffer.from('fake'),
          "testNewProfileThumbnail.jpg"
        )
        .expect(200);

      expect(fileService.deleteFile).toHaveBeenCalledTimes(1);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickname).toBe(patchData.nickname);
      expect(patchMember?.profile).not.toBe(saveMember.profile);

      const profileThumbnailValid: boolean = patchMember!.profile!.endsWith('_300.jpg');
      expect(profileThumbnailValid).toBeTruthy();
    });

    it('모든 필드가 undefined인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .expect(200);

      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBe(saveMember.profile);
    });

    it('nickname은 undefined, deleteProfile이 존재하지만 새로운 이미지 파일은 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchData = {
        deleteProfile: saveMember.profile
      };

      await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .field('deleteProfile', patchData.deleteProfile!)
        .expect(200);


      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchData.deleteProfile}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBeNull();
    });

    it('닉네임과 수정 이미지는 있는데 삭제 이미지가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchData = {
        nickname: 'patchNickname',
        deleteProfile: saveMember.profile
      };

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .field('nickname', patchData.nickname)
        .attach(
          'profile',
          Buffer.from('fake'),
          "testNewProfileThumbnail.jpg"
        )
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);

      expect(fileService.deleteFile).toHaveBeenCalledTimes(1);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBe(saveMember.profile);
    });

    it('비회원이 요청한 경우', async () => {
      const patchData = {
        nickname: 'patchNickname',
        deleteProfile: saveMember.profile
      };

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .field('nickname', patchData.nickname)
        .attach(
          'profileThumbnail',
          Buffer.from('fake'),
          "testNewProfileThumbnail.jpg"
        )
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });
  });

  describe('GET /profile', () => {
    it('정상 조회', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      const mailFixtureSplit: string[] = saveMember.email.split('@');
      const mailPrefixFixture: string = mailFixtureSplit[0];
      const mailSuffixFixture: string = mailFixtureSplit[1];
      const mailTypeFixture: string = MemberMailConstants.NONE;

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .expect(200);

      const body: ApiResponse<ProfileResponse> = response.body;
      expect(body.code).toBe(200);
      const content: ProfileResponse | null = body.content;

      expect(content).not.toBeNull();

      expect(content?.nickname).toBe(saveMember.nickname);
      expect(content?.mailPrefix).toBe(mailPrefixFixture);
      expect(content?.mailSuffix).toBe(mailSuffixFixture);
      expect(content?.mailType).toBe(mailTypeFixture);
      expect(content?.profile).toBe(saveMember.profile);
    });

    it('비회원이 요청한 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/profile`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    })
  })
})