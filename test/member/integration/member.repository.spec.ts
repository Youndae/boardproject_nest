import { MemberRepository } from '#member/repositories/member.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { Member } from '#member/entities/member.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { MemberModule } from '#member/member.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { ProfileResponseDTO } from '#member/dtos/out/profileResponse.dto';

describe('memberRepository', () => {
  let memberRepository: MemberRepository;
  let dataSource: DataSource;
  let app: INestApplication;

  const localMember: Member = new Member();
  const googleMember: Member = new Member();

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        MemberModule,
      ],
      providers: [MemberRepository],
    }).compile();
    
    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    app = moduleFixture.createNestApplication();
    await app.init();
  })

  beforeEach(async () => {
    await memberRepository.deleteAll();

    localMember.userId = 'tester';
    localMember.userPw = '1234';
    localMember.userName = 'testerName';
    localMember.nickName = 'testerNickname';
    localMember.email = 'tester@tester.com';
    localMember.profileThumbnail = 'localProfileName.jpg';
    localMember.provider = 'local';

    googleMember.userId = 'googleTester';
    googleMember.userPw = '1234';
    googleMember.userName = 'googleTesterName';
    googleMember.nickName = null;
    googleMember.email = 'googleTester@tester.com';
    googleMember.profileThumbnail = null;
    googleMember.provider = 'google';

    const saveLocalMember: Member = memberRepository.create(localMember);
    const saveGoogleMember: Member = memberRepository.create(googleMember);

    await memberRepository.save(saveLocalMember);
    await memberRepository.save(saveGoogleMember);
  })

  afterAll(async () => {
    await dataSource.destroy();

    await app.close();
  })
  
  describe('test', () => {
    it('정상 조회', async () => {
      const member: Member | null = await memberRepository.findMemberByUserIdFromLocal(localMember.userId);

      expect(member?.userId).toBe(localMember.userId);
      expect(member?.userPw).toBe(localMember.userPw);
      expect(member?.userName).toBeUndefined();
      expect(member?.nickName).toBeUndefined();
      expect(member?.email).toBeUndefined();
      expect(member?.profileThumbnail).toBeUndefined();
      expect(member?.provider).toBeUndefined();
    });

    it('local이 아닌 회원 조회', async () => {
      const member: Member | null = await memberRepository.findMemberByUserIdFromLocal(googleMember.userId);

      expect(member).toBeNull();
    })
  });

  describe('findOAuthMember', () => {
    it('정상 조회', async () => {
      const member: Member | null = await memberRepository.findOAuthMember(googleMember.provider, googleMember.userId)

      expect(member).not.toBeNull();
      expect(member?.userId).toBe(googleMember.userId);
      expect(member?.userPw).toBeUndefined();
      expect(member?.userName).toBeUndefined();
      expect(member?.nickName).toBeUndefined();
      expect(member?.email).toBeUndefined();
      expect(member?.profileThumbnail).toBeUndefined();
      expect(member?.provider).toBeUndefined();
    });

    it('provider가 일치하지 않는 경우', async () => {
      const member: Member | null = await memberRepository.findOAuthMember('naver', googleMember.userId);

      expect(member).toBeNull();
    });

    it('provider가 local인 경우', async () => {
      const member: Member | null = await memberRepository.findOAuthMember(localMember.provider, localMember.userId);

      expect(member).toBeNull();
    });
  });

  describe('findUserId', () => {
    it('정상 조회', async () => {
      const userId: string | null = await memberRepository.findUserId(localMember.userId);

      expect(userId).toBe(localMember.userId);
    });

    it('해당 사용자가 없는 경우', async () => {
      const userId: string | null = await memberRepository.findUserId('nonMember');

      expect(userId).toBeNull();
    });
  });

  describe('findMemberProfileByUserId', () => {
    it('정상 조회', async () => {
      const result: ProfileResponseDTO = await memberRepository.findMemberProfileByUserId(localMember.userId);

      expect(result.nickName).toBe(localMember.nickName);
      expect(result.profileThumbnail).toBe(localMember.profileThumbnail);
    });

    it('닉네임과 프로필 이미지 모두 Null인 사용자 정상 조회', async () => {
      const result: ProfileResponseDTO = await memberRepository.findMemberProfileByUserId(googleMember.userId);

      expect(result.nickName).toBeNull();
      expect(result.profileThumbnail).toBeNull();
    });

    it('존재하지 않는 사용자 조회', async () => {
      const result: ProfileResponseDTO = await memberRepository.findMemberProfileByUserId('noneMember');

      expect(result.nickName).toBeNull();
      expect(result.profileThumbnail).toBeNull();
    })
  })
})