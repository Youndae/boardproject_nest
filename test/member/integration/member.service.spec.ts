import { MemberService } from '#member/services/member.service';
import { MemberRepository } from '#member/repositories/member.repository';
import { AuthRepository } from '#member/repositories/auth.repository';
import { ResizingService } from '#common/services/resizing.service';
import { FileService } from '#common/services/file.service';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberModule } from '#member/member.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { JoinDTO } from '#member/dtos/in/join.dto';
import { Member } from '#member/entities/member.entity';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { Auth } from '#member/entities/auth.entity';
import { PatchProfileDto } from '#member/dtos/in/patch-profile.dto';
import { ProfileResponseDto } from '#member/dtos/out/profile-response.dto';

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
    saveMember.userPw = '1234';
    saveMember.userName = 'testerName';
    saveMember.nickName = 'testerNickname';
    saveMember.email = 'tester@tester.com';
    saveMember.profileThumbnail = 'testProfileThumbnail.png';
    saveMember.provider = 'local';

    const auth: Auth = authRepository.create({
      userId: saveMember.userId,
      auth: 'ROLE_MEMBER'
    });

    await memberRepository.save(saveMember);
    await authRepository.save(auth);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();

    await app.close();
  })

  describe('register', () => {
    const joinDTO: JoinDTO = {
      userId: 'tester2',
      userPw: '1234',
      userName: 'tester2Name',
      nickName: 'tester2Nickname',
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
      await memberService.register(joinDTO, emptyReq);
      
      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();
      
      const saveMember: Member | null = await memberRepository.findOne({
        where: { userId: joinDTO.userId },
      });
      
      expect(saveMember).not.toBeNull();
      expect(saveMember?.profileThumbnail).toBeNull();
      expect(saveMember?.userName).toBe(joinDTO.userName);
      expect(saveMember?.nickName).toBe(joinDTO.nickName);
      expect(saveMember?.email).toBe(joinDTO.email);
      expect(saveMember?.provider).toBe('local');

      expect(saveMember?.userPw).not.toBeNull();
      const passwordMatched = bcrypt.compare(joinDTO.userPw, saveMember!.userPw);
      expect(passwordMatched).toBeTruthy();

      const saveAuth: Auth | null = await authRepository.findOne({
        where: { userId: joinDTO.userId }
      });

      expect(saveAuth?.auth).toBe(memberRole);
    });

    it('프로필, 닉네임 미포함 정상 처리', async() => {
      const emptyReq: any = { file: undefined }
      const newJoinDTO: JoinDTO = {
        ...joinDTO,
        nickName: undefined
      };

      await memberService.register(newJoinDTO, emptyReq);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const saveMember: Member | null = await memberRepository.findOne({
        where: { userId: joinDTO.userId },
      });

      expect(saveMember).not.toBeNull();
      expect(saveMember?.profileThumbnail).toBeNull();
      expect(saveMember?.userName).toBe(joinDTO.userName);
      expect(saveMember?.nickName).toBeNull();
      expect(saveMember?.email).toBe(joinDTO.email);
      expect(saveMember?.provider).toBe('local');

      expect(saveMember?.userPw).not.toBeNull();
      const passwordMatched = bcrypt.compare(joinDTO.userPw, saveMember!.userPw);
      expect(passwordMatched).toBeTruthy();

      const saveAuth: Auth | null = await authRepository.findOne({
        where: { userId: joinDTO.userId }
      });

      expect(saveAuth?.auth).toBe(memberRole);
    });

    it('auth 저장 과정에서 오류 발생. 롤백 및 파일 제거', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      jest.spyOn(authRepository, 'save')
        .mockImplementationOnce(() => {
          throw new Error('test Internal Server Error');
        })

      await expect(memberService.register(joinDTO, req))
        .rejects.toThrow('test Internal Server Error');

      const member: Member | null = await memberRepository.findOne({ where: { userId: joinDTO.userId } });

      expect(member).toBeNull();
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${resizedFilename}`);
    });

    it('auth 저장 과정에서 오류 발생. 롤백. 제거할 파일이 없는 경우', async () => {
      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      jest.spyOn(authRepository, 'save')
        .mockImplementationOnce(() => {
          throw new Error('test Internal Server Error');
        })

      await expect(memberService.register(joinDTO, emptyReq))
        .rejects.toThrow('test Internal Server Error');

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const member: Member | null = await memberRepository.findOne({ where: { userId: joinDTO.userId } });

      expect(member).toBeNull();
    });
  });

  describe('checkId', () => {
    it('중복이 아닌 경우', async () => {
      const result: boolean = await memberService.checkId('noneMember');

      expect(result).toBeFalsy();
    });

    it('중복인 경우', async () => {
      const result: boolean = await memberService.checkId(saveMember.userId);

      expect(result).toBeTruthy();
    });
  });

  describe('checkNickname', () => {
    it('비회원 요청. 중복이 아닌 경우', async () => {
      const result: boolean = await memberService.checkNickname('noneNickname', undefined);

      expect(result).toBeFalsy();
    });

    it('비회원 요청. 중복인 경우', async () => {
      const result: boolean = await memberService.checkNickname(saveMember.nickName!, undefined);

      expect(result).toBeTruthy();
    });

    it('회원 요정. 현재 닉네임과 동일한 닉네임으로 체크하는 경우', async () => {
      const result: boolean = await memberService.checkNickname(saveMember.nickName!, saveMember.userId!);

      expect(result).toBeFalsy();
    })

    it('회원 요청. 중복인 경우', async () => {
      const newMember: Member = memberRepository.create({
        userId: 'tester3',
        userPw: '1234',
        userName: 'tester3Name',
        nickName: 'tester3Nickname',
        email: 'tester3@tester.com',
        provider: 'local'
      });
      await memberRepository.save(newMember);

      const result: boolean = await memberService.checkNickname(newMember.nickName!, saveMember.userId!);

      expect(result).toBeTruthy();
    });
  });

  describe('patchProfile', () => {
    const resizedFilename: string = 'resizedNewProfile.png';

    it('프로필 이미지는 undefined, nickname은 blank로 요청된 경우', async () => {
      const patchProfile: PatchProfileDto = new PatchProfileDto('', undefined);
      const patchReq: any = {
        user: {
          userId: saveMember.userId,
          roles: ['ROLE_MEMBER'],
        },
      }

      await memberService.patchProfile(patchProfile, patchReq);

      expect(resizingService.resizeProfileImage).not.toHaveBeenCalled();
      expect(fileService.deleteFile).not.toHaveBeenCalled();

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickName).toBeNull();
      expect(patchMember?.profileThumbnail).toBe(saveMember.profileThumbnail);
    });

    it('프로필 이미지와 기존 이미지명, nickname 모두 포함해서 요청하는 경우', async () => {
      const newNickname: string = 'newTesterNickname';
      const patchProfile: PatchProfileDto = new PatchProfileDto(newNickname, saveMember.profileThumbnail!);
      const patchReq: any = {
        user: {
          userId: saveMember.userId,
          roles: ['ROLE_MEMBER']
        },
        file: { filename: 'newThumbnail.jpg' }
      };

      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      await memberService.patchProfile(patchProfile, patchReq);

      expect(resizingService.resizeProfileImage).toHaveBeenCalledWith(destDir, patchReq.file.filename);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${saveMember.profileThumbnail}`)

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickName).toBe(newNickname);
      expect(patchMember?.profileThumbnail).toBe(`profile/${resizedFilename}`);
    });

    it('기존 thumbnail이 존재하는데 프로필 이미지와 nickname만 요청하는 경우', async () => {
      const newNickname: string = 'newTesterNickname';
      const patchProfile: PatchProfileDto = new PatchProfileDto(newNickname, undefined);
      const patchReq: any = {
        user: {
          userId: saveMember.userId,
          roles: ['ROLE_MEMBER']
        },
        file: { filename: 'newThumbnail.jpg' }
      };

      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      await memberService.patchProfile(patchProfile, patchReq);

      expect(resizingService.resizeProfileImage).toHaveBeenCalledWith(destDir, patchReq.file.filename);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${saveMember.profileThumbnail}`)

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickName).toBe(newNickname);
      expect(patchMember?.profileThumbnail).toBe(`profile/${resizedFilename}`);
    });

    it('사용자 데이터가 없는 경우', async () => {
      const newNickname: string = 'newTesterNickname';
      const patchProfile: PatchProfileDto = new PatchProfileDto(newNickname, undefined);
      const patchReq: any = {
        user: {
          userId: 'noneMember'
        },
        file: { filename: 'newThumbnail.jpg' }
      };

      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock)
        .mockResolvedValue(undefined);

      await expect(memberService.patchProfile(patchProfile, patchReq))
        .rejects
        .toThrow('ACCESS_DENIED');

      expect(resizingService.resizeProfileImage).toHaveBeenCalledWith(destDir, patchReq.file.filename);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${resizedFilename}`);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${patchReq.file.filename}`);

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickName).toBe(saveMember.nickName);
      expect(patchMember?.profileThumbnail).toBe(saveMember.profileThumbnail);
    });

    it('정상 요청이지만 기존 이미지 삭제에서 오류가 발생한 경우', async () => {
      const newNickname: string = 'newTesterNickname';
      const patchProfile: PatchProfileDto = new PatchProfileDto(newNickname, saveMember.profileThumbnail!);
      const patchReq: any = {
        user: {
          userId: saveMember.userId,
          roles: ['ROLE_MEMBER']
        },
        file: { filename: 'newThumbnail.jpg' }
      };

      (resizingService.resizeProfileImage as jest.Mock)
        .mockResolvedValue({ resizedFilename });
      (fileService.deleteFile as jest.Mock).mockImplementationOnce(() => {
        throw new Error();
      });

      await memberService.patchProfile(patchProfile, patchReq);

      expect(resizingService.resizeProfileImage).toHaveBeenCalledWith(destDir, patchReq.file.filename);
      expect(fileService.deleteFile).toHaveBeenCalledWith(`${destDir}/${saveMember.profileThumbnail}`)

      const patchMember: Member | null = await memberRepository.findOne({ where: { userId: saveMember.userId } });

      expect(patchMember?.nickName).toBe(newNickname);
      expect(patchMember?.profileThumbnail).toBe(`profile/${resizedFilename}`);

      expect(fileService.deleteFile).not.toHaveBeenCalledWith(`${destDir}/${resizedFilename}`)
    });
  });

  describe('getProfile', () => {
    it('정상 조회', async () => {
      const result: ProfileResponseDto = await memberService.getProfile(saveMember.userId);

      expect(result.nickName).toBe(saveMember.nickName);
      expect(result.profileThumbnail).toBe(saveMember.profileThumbnail);
    });


  })
})