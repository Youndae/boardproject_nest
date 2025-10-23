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
import { FileService } from '#common/services/file.service';
import { ConfigService } from '@nestjs/config';
import { Member } from '#member/entities/member.entity';
import { Auth } from '#member/entities/auth.entity';
import { TestTokenUtil } from '../../utils/testToken.util';
import bcrypt from 'bcrypt';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { REDIS_CLIENT } from '#config/redis/redis.module';
import type { RedisClientType } from 'redis';

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
    await app.init();
  });

  beforeEach(async () => {
    await memberRepository.deleteAll();

    saveMember.userId = 'tester';
    saveMember.userPw = '1234';
    saveMember.userName = 'testerName';
    saveMember.nickName = 'testerNickname';
    saveMember.email = 'tester@tester.com';
    saveMember.profileThumbnail = 'testProfileThumbnail.png';
    saveMember.provider = 'local';

    const auth: Auth = authRepository.create({
      userId: saveMember.userId,
      auth: memberRole
    });

    await memberRepository.save(saveMember);
    await authRepository.save(auth);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if(redisClient?.isOpen)
      await redisClient.flushAll();
  })

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  })


  describe('GET /check-login', () => {
    it('로그인 상태', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-login`)
        .set('Cookie', tokenCookies)
        .expect(200);

      expect(response.body.loginStatus).toBeTruthy();
    });

    it('비로그인 상태', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-login`)
        .expect(200);

      expect(response.body.loginStatus).toBeFalsy();
    })
  })

  describe('POST /register', () => {
    it('모든 데이터가 존재할 때', async () => {
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        nickName: 'testerNickname2',
        email: 'tester2@tester.com'
      }

      await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', registerMember.nickName)
        .field('email', registerMember.email)
        .attach(
          'profileThumbnail',
          Buffer.from('fake'),
          "testProfileThumbnail.jpg"
        )
        .expect(201);

      const saveMember: Member | null = await memberRepository.findOne({ where: { userId: registerMember.userId } });

      expect(saveMember).toBeDefined();

      const passwordValid: boolean = await bcrypt.compare(registerMember.userPw, saveMember!.userPw);
      expect(passwordValid).toBeTruthy();

      expect(saveMember?.userName).toBe(registerMember.userName);
      expect(saveMember?.nickName).toBe(registerMember.nickName);
      expect(saveMember?.email).toBe(registerMember.email);
      expect(saveMember?.provider).toBe('local');
      expect(saveMember?.profileThumbnail).toBeDefined();

      const profileThumbnailValid: boolean = saveMember!.profileThumbnail!.endsWith('_300.jpg');
      expect(profileThumbnailValid).toBeTruthy();
    });

    it('닉네임과 프로필 이미지가 없을 때', async () => {
      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        email: 'tester2@tester.com'
      }

      await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('email', registerMember.email)
        .expect(201);

      const saveMember: Member | null = await memberRepository.findOne({ where: { userId: registerMember.userId } });

      expect(saveMember).toBeDefined();

      const passwordValid: boolean = await bcrypt.compare(registerMember.userPw, saveMember!.userPw);
      expect(passwordValid).toBeTruthy();

      expect(saveMember?.userName).toBe(registerMember.userName);
      expect(saveMember?.nickName).toBeNull();
      expect(saveMember?.email).toBe(registerMember.email);
      expect(saveMember?.provider).toBe('local');
      expect(saveMember?.profileThumbnail).toBeNull();
    });

    it('비밀번호가 짧은 경우', async () => {
      const registerMember = {
        userId: 'tester2',
        userPw: 'test1!',
        userName: 'testerName2',
        nickName: 'testerNickname2',
        email: 'tester2@tester.com'
      }

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', registerMember.nickName)
        .field('email', registerMember.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('아이디가 한글자인 경우', async () => {
      const registerMember = {
        userId: 't',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        nickName: 'testerNickname2',
        email: 'tester2@tester.com'
      }

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', registerMember.nickName)
        .field('email', registerMember.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('userName이 한글자인 경우', async () => {
      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 't',
        nickName: 'testerNickname2',
        email: 'tester2@tester.com'
      }

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', registerMember.nickName)
        .field('email', registerMember.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('닉네임이 한글자인 경우', async () => {
      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        nickName: 't',
        email: 'tester2@tester.com'
      }

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', registerMember.nickName)
        .field('email', registerMember.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('이메일 형식이 정상이 아닌 경우', async () => {
      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        nickName: 'testerNickname2',
        email: 'tester2!tester.com'
      }

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', registerMember.nickName)
        .field('email', registerMember.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('로그인한 사용자가 요청을 보낸 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        email: 'tester2@tester.com'
      }

      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .set('Cookie', tokenCookies)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('email', registerMember.email)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    });

    it('이미 존재하는 사용자 아이디로 요청한 경우', async () => {
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', saveMember.userId)
        .field('userPw', saveMember.userPw)
        .field('userName', saveMember.userName)
        .field('email', saveMember.email)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('이미 존재하는 닉네임으로 요청한 경우', async () => {
      const registerMember = {
        userId: 'tester2',
        userPw: 'testerpw12!@',
        userName: 'testerName2',
        email: 'tester2@tester.com'
      }

      await request(app.getHttpServer())
        .post(`${baseUrl}/join`)
        .field('userId', registerMember.userId)
        .field('userPw', registerMember.userPw)
        .field('userName', registerMember.userName)
        .field('nickName', saveMember.nickName!)
        .field('email', registerMember.email)
        .expect(500);
    })
  });

  describe('GET /check-id', () => {
    it('중복이 아닌 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-id`)
        .query({ 'userId': 'noneUserId' })
        .expect(200);

      expect(response.body.isExists).toBeFalsy();
    });

    it('중복인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-id`)
        .query({ 'userId': saveMember.userId })
        .expect(200);

      expect(response.body.isExists).toBeTruthy();
    });

    it('query가 없는 경우', async () => {
      await request(app.getHttpServer())
        .get(`${baseUrl}/check-id`)
        .expect(400);
    });

    it('로그인 상태인 사용자가 요청한 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-id`)
        .set('Cookie', tokenCookies)
        .query({ 'userId': 'noneUserId' })
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    })
  });

  describe('GET /check-nickname', () => {
    it('비회원이며 중복이 아닌 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .query({ 'nickname' : 'noneNickname' })
        .expect(200);

      expect(response.body.isExists).toBeFalsy();
    });

    it('비회원이며 중복인 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .query({ 'nickname' : saveMember.nickName })
        .expect(200);

      expect(response.body.isExists).toBeTruthy();
    });

    it('nickname 쿼리가 없는 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .expect(400);

      expect(response.body.message).toBe(ResponseStatusConstants.BAD_REQUEST.MESSAGE);
    });

    it('회원이며 중복이 아닌 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .set('Cookie', tokenCookies)
        .query({ 'nickname' : 'noneNickname' })
        .expect(200);

      expect(response.body.isExists).toBeFalsy();
    });

    it('회원이며 중복이지만 자신의 닉네임과 일치하는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .set('Cookie', tokenCookies)
        .query({ 'nickname' : saveMember.nickName })
        .expect(200);

      expect(response.body.isExists).toBeFalsy();
    });

    it('회원이며 중복인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const newMember: Member = memberRepository.create({
        userId: 'tester2',
        userPw: 'tester2pw',
        userName: 'testerName2',
        nickName: 'testerNickname2',
        email: 'tester2@tester.com',
        provider: 'local',
      });

      await memberRepository.save(newMember);

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/check-nickname`)
        .set('Cookie', tokenCookies)
        .query({ 'nickname' : newMember.nickName })
        .expect(200);

      expect(response.body.isExists).toBeTruthy();
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
        deleteProfile: saveMember.profileThumbnail
      };

      await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .field('nickname', patchData.nickname)
        .field('deleteProfile', patchData.deleteProfile!)
        .attach(
          'profileThumbnail',
          Buffer.from('fake'),
          "testNewProfileThumbnail.jpg"
        )
        .expect(200);

      expect(fileService.deleteFile).toHaveBeenCalledTimes(2);
      expect(fileService.deleteFile).toHaveBeenLastCalledWith(`${destDir}/${patchData.deleteProfile}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickName).toBe(patchData.nickname);
      expect(patchMember?.profileThumbnail).not.toBe(saveMember.profileThumbnail);

      const profileThumbnailValid: boolean = patchMember!.profileThumbnail!.endsWith('_300.jpg');
      expect(profileThumbnailValid).toBeTruthy();
    });

    it('모든 필드가 undefined인 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .expect(200);

      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickName).toBeNull();
      expect(patchMember?.profileThumbnail).toBe(saveMember.profileThumbnail);
    });

    it('nickname은 undefined, deleteProfile이 존재하지만 새로운 이미지 파일은 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchData = {
        deleteProfile: saveMember.profileThumbnail
      };

      await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .field('deleteProfile', patchData.deleteProfile!)
        .expect(200);


      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchData.deleteProfile}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickName).toBeNull();
      expect(patchMember?.profileThumbnail).toBeNull();
    });

    it('닉네임과 수정 이미지는 있는데 삭제 이미지가 없는 경우', async () => {
      const tokenCookies: string[] = await tokenUtil.createTokenAndCookies(saveMember.userId);
      toFileMock.mockResolvedValueOnce({});
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchData = {
        nickname: 'patchNickname',
        deleteProfile: saveMember.profileThumbnail
      };

      await request(app.getHttpServer())
        .patch(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .field('nickname', patchData.nickname)
        .attach(
          'profileThumbnail',
          Buffer.from('fake'),
          "testNewProfileThumbnail.jpg"
        )
        .expect(200);

      expect(fileService.deleteFile).toHaveBeenCalledTimes(2);
      expect(fileService.deleteFile).toHaveBeenLastCalledWith(`${destDir}/${patchData.deleteProfile}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember).toBeDefined();
      expect(patchMember?.nickName).toBe(patchData.nickname);
      expect(patchMember?.profileThumbnail).not.toBe(saveMember.profileThumbnail);

      const profileThumbnailValid: boolean = patchMember!.profileThumbnail!.endsWith('_300.jpg');
      expect(profileThumbnailValid).toBeTruthy();
    });

    it('비회원이 요청한 경우', async () => {
      const patchData = {
        nickname: 'patchNickname',
        deleteProfile: saveMember.profileThumbnail
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

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/profile`)
        .set('Cookie', tokenCookies)
        .expect(200);

      expect(response).toBeDefined();
      expect(response.body.nickName).toBe(saveMember.nickName);
      expect(response.body.profileThumbnail).toBe(saveMember.profileThumbnail);
    });

    it('비회원이 요청한 경우', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/profile`)
        .expect(403);

      expect(response.body.message).toBe(ResponseStatusConstants.FORBIDDEN.MESSAGE);
    })
  })
})