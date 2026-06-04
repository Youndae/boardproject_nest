import { MemberService } from '#member/services/member.service';
import { MemberRepository } from '#member/repositories/member.repository';
import { AuthRepository } from '#member/repositories/auth.repository';
import { ResizingService } from '#src/file/service/resizing.service';
import { FileService } from '#src/file/service/file.service';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberModule } from '#member/member.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { JoinRequest } from '#member/dtos/in/join.request.dto';
import { Member } from '#member/entities/member.entity';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { Auth } from '#member/entities/auth.entity';
import { PatchProfileRequest } from '#member/dtos/in/patch-profile.request.dto';
import { ProfileResponse } from '#member/dtos/out/profile.response.dto';
import { UserDuplicatedException } from '#common/exceptions/user-duplicated.exception';
import { BadRequestException } from '#common/exceptions/bad-request.exception';
import { AccessDeniedException } from '#common/exceptions/access-denied.exception';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';
import { MemberMailConstants } from '#member/constants/member-mail.constants';

describe('member.service Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let memberService: MemberService;
  let memberRepository: MemberRepository;
  let authRepository: AuthRepository;
  let resizingService: ResizingService;
  let fileService: FileService;
  let configService: ConfigService;

  const memberRole: string = 'ROLE_MEMBER';
  const saveMember: Member = new Member();
  let destDir: string;


  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MemberModule,
        TestDatabaseModule,
      ],
      providers: [
        MemberService,
        MemberRepository,
        AuthRepository,
      ]
    })
      .overrideProvider(ResizingService)
      .useValue({ resizeProfileImage: jest.fn() })
      .overrideProvider(FileService)
      .useValue({ deleteFile: jest.fn() })
      .compile();

    memberService = moduleFixture.get<MemberService>(MemberService);
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    resizingService = moduleFixture.get<ResizingService>(ResizingService);
    fileService = moduleFixture.get<FileService>(FileService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    app = moduleFixture.createNestApplication();

    destDir = configService.get<string>('PROFILE_FILE_PATH') ?? '';

    await app.init();
  });

  beforeEach(async () => {
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
      auth: 'ROLE_MEMBER'
    });


    await authRepository.save(auth);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();

    await app.close();
  })

  describe('register', () => {
    const joinDTO: JoinRequest = {
      userId: 'tester2',
      password: '1234',
      userName: 'tester2Name',
      nickname: 'tester2Nickname',
      email: 'tester2@tester.com'
    };

    const req: any = {
      file: { filename: 'origin.png' },
    };

    const emptyReq: any = { file: undefined }
    
    const resizedFilename: string = 'resized.png';
    
    it('프로필 포함 정상 처리', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      await memberService.register(joinDTO, req);
    });
    
    it('프로필 미포함 정상 처리', async() => {
      await memberService.register(joinDTO, emptyReq.file);
      
      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();
      
      const saveMember: Member | null = await memberRepository.findOne({
        where: { userId: joinDTO.userId },
      });
      
      expect(saveMember).not.toBeNull();
      expect(saveMember?.profile).toBeNull();
      expect(saveMember?.username).toBe(joinDTO.userName);
      expect(saveMember?.nickname).toBe(joinDTO.nickname);
      expect(saveMember?.email).toBe(joinDTO.email);
      expect(saveMember?.provider).toBe('local');

      expect(saveMember?.password).not.toBeNull();
      const passwordMatched = bcrypt.compare(joinDTO.password, saveMember!.password!);
      expect(passwordMatched).toBeTruthy();

      const saveAuth: Auth | null = await authRepository.findOne({
        where: { userId: saveMember!.id }
      });

      expect(saveAuth).not.toBeNull();
      expect(saveAuth?.auth).toBe(memberRole);
    });

    it('auth 저장 과정에서 오류 발생. 롤백 및 파일 제거', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue(resizedFilename);
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      jest.spyOn(authRepository, 'save')
        .mockImplementationOnce(() => {
          throw new Error('test Internal Server Error');
        })

      await expect(memberService.register(joinDTO, req.file))
        .rejects.toThrow('test Internal Server Error');

      const member: Member | null = await memberRepository.findOne({ where: { userId: joinDTO.userId } });

      expect(member).toBeNull();
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${resizedFilename}`);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${req.file.filename}`);
    });

    it('auth 저장 과정에서 오류 발생. 롤백. 제거할 파일이 없는 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue(undefined);
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      jest.spyOn(authRepository, 'save')
        .mockImplementationOnce(() => {
          throw new Error('test Internal Server Error');
        })

      await expect(memberService.register(joinDTO, emptyReq.file))
        .rejects.toThrow('test Internal Server Error');

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const member: Member | null = await memberRepository.findOne({ where: { userId: joinDTO.userId } });

      expect(member).toBeNull();
    });
  });

  describe('checkId', () => {
    // 오류가 발생하지 않는다면 중복이 아닌것으로 처리.
    it('중복이 아닌 경우', async () => {
      await memberService.checkId('noneMember');
    });

    it('중복인 경우', async () => {
      await expect(memberService.checkId(saveMember.userId))
        .rejects
        .toThrow(UserDuplicatedException);
    });
  });

  describe('checkNickname', () => {
    it('비회원 요청. 중복이 아닌 경우', async () => {
      await memberService.checkNickname('noneNickname', undefined);
    });

    it('비회원 요청. 중복인 경우', async () => {
      await expect(memberService.checkNickname(saveMember.nickname!, undefined))
        .rejects
        .toThrow(UserDuplicatedException);
    });

    it('회원 요정. 현재 닉네임과 동일한 닉네임으로 체크하는 경우', async () => {
      await memberService.checkNickname(saveMember.nickname!, saveMember.id);
    })

    it('회원 요청. 중복인 경우', async () => {
      const newMember: Member = memberRepository.create({
        userId: 'tester3',
        password: '1234',
        username: 'tester3Name',
        nickname: 'tester3Nickname',
        email: 'tester3@tester.com',
        provider: 'local'
      });
      await memberRepository.save(newMember);

      await expect(memberService.checkNickname(newMember.nickname!, saveMember.id!))
        .rejects
        .toThrow(UserDuplicatedException);
    });
  });

  describe('patchProfile', () => {
    const resizedFilename: string = 'resizedNewProfile.png';
    const patchProfileReq: any = {
      file: { filename: 'patchOrigin.png' },
    };
    const patchEmptyReq: any = {
      file: undefined
    };
    it('정상 처리. 새로운 이미지 포함', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue(resizedFilename);
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);
      
      const patchProfile: PatchProfileRequest = new PatchProfileRequest();
      patchProfile.nickname = 'newTesterNick';
      patchProfile.deleteProfile = saveMember.profile!;
      
      await memberService.patchProfile(patchProfile, saveMember.id, patchProfileReq.file);
      
      expect(resizingService.resizeProfileImage).toHaveBeenCalledWith(destDir, patchProfileReq.file.filename);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchProfile.deleteProfile}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { id: saveMember.id } });

      expect(patchMember).not.toBeNull();
      expect(patchMember?.nickname).toBe(patchProfile.nickname);
      expect(patchMember?.profile).toBe(resizedFilename);
      expect(patchMember?.username).toBe(saveMember.username);
      expect(patchMember?.userId).toBe(saveMember.userId);
    })

    it('모든 데이터가 undefined인 경우', async () => {
      const patchProfile: PatchProfileRequest = new PatchProfileRequest();

      await memberService.patchProfile(patchProfile, saveMember.id, undefined);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const patchMember: Member | null = await memberRepository.findOne({ where: { id: saveMember.id } });

      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBe(saveMember.profile);
    });

    it('닉네임만 값이 있는 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);
      const patchProfile: PatchProfileRequest = new PatchProfileRequest();
      patchProfile.nickname = 'newTesterNickname';

      await memberService.patchProfile(patchProfile, saveMember.id, undefined);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled()

      const patchMember: Member | null = await memberRepository.findOne({ where: { id: saveMember.id } });

      expect(patchMember?.nickname).toBe(patchProfile.nickname);
      expect(patchMember?.profile).toBe(saveMember.profile);
    });

    it('닉네임은 undefined, 삭제할 프로필만 존재하는 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchProfile: PatchProfileRequest = new PatchProfileRequest();
      patchProfile.deleteProfile = saveMember.profile!;

      await memberService.patchProfile(patchProfile, saveMember.id, undefined);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchProfile.deleteProfile}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: {id: saveMember.id } });

      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBeNull();
    })

    it('기존 thumbnail이 존재하는데 새로운 프로필 이미지와 nickname만 요청하는 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchProfile: PatchProfileRequest = new PatchProfileRequest();
      patchProfile.nickname = 'newTesterNick';

      await expect(memberService.patchProfile(patchProfile, saveMember.id, patchProfileReq.file))
        .rejects
        .toThrow(BadRequestException);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchProfileReq.file.filename}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBe(saveMember.profile);
    });

    it('사용자 데이터가 없는 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      const patchProfile: PatchProfileRequest = new PatchProfileRequest();
      patchProfile.nickname = 'newTesterNick';
      patchProfile.deleteProfile = saveMember.profile!;

      await expect(memberService.patchProfile(patchProfile, 9999, patchProfileReq.file))
        .rejects
        .toThrow(AccessDeniedException);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchProfileReq.file.filename}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickname).toBe(saveMember.nickname);
      expect(patchMember?.profile).toBe(saveMember.profile);
    });

    it('정상 요청이지만 기존 이미지 삭제에서 오류가 발생한 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue(resizedFilename);
      (fileService.deleteFile as jest.Mock).mockImplementationOnce(() => {
        throw new Error();
      });

      const patchProfile: PatchProfileRequest = new PatchProfileRequest();
      patchProfile.nickname = 'newTesterNick';
      patchProfile.deleteProfile = saveMember.profile!;

      await memberService.patchProfile(patchProfile, saveMember.id, patchProfileReq.file);

      expect(resizingService.resizeProfileImage).toHaveBeenCalledWith(destDir, patchProfileReq.file.filename);
      expect(fileService.deleteFile).toHaveBeenCalledTimes(1);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${saveMember.profile}`)


      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickname).toBe(patchProfile.nickname);
      expect(patchMember?.profile).toBe(resizedFilename);
    });
  });

  describe('getProfile', () => {
    it('정상 조회', async () => {
      const result: ProfileResponse = await memberService.getProfile(saveMember.id);
      const mailFixtureSplit: string[] = saveMember.email.split('@');
      const mailPrefixFixture: string = mailFixtureSplit[0];
      const mailSuffixFixture: string = mailFixtureSplit[1];
      const mailTypeFixture: string = MemberMailConstants.NONE;


      expect(result.nickname).toBe(saveMember.nickname);
      expect(result.mailPrefix).toBe(mailPrefixFixture);
      expect(result.mailSuffix).toBe(mailSuffixFixture);
      expect(result.mailType).toBe(mailTypeFixture);
      expect(result.profile).toBe(saveMember.profile);
    });

    it('사용자가 없는 경우', async() => {
      await expect(memberService.getProfile(9999))
        .rejects
        .toThrow(InternalServerErrorException);
    })
  })
})