import { MemberRepository } from '#member/repositories/member.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { Member } from '#member/entities/member.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { MemberModule } from '#member/member.module';
import { TestDatabaseModule } from '../../module/testDatabase.module';

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
    localMember.password = '1234';
    localMember.username = 'testerName';
    localMember.nickname = 'testerNickname';
    localMember.email = 'tester@tester.com';
    localMember.profile = 'localProfileName.jpg';
    localMember.provider = 'local';

    googleMember.userId = 'googleTester';
    googleMember.password = '1234';
    googleMember.username = 'googleTesterName';
    googleMember.nickname = null;
    googleMember.email = 'googleTester@tester.com';
    googleMember.profile = null;
    googleMember.provider = 'google';

    const saveLocalMember: Member = memberRepository.create(localMember);
    const saveGoogleMember: Member = memberRepository.create(googleMember);

    const savedLocalMember: Member = await memberRepository.save(saveLocalMember);
    const savedGoogleMember: Member = await memberRepository.save(saveGoogleMember);
    localMember.id = savedLocalMember.id;
    googleMember.id = savedGoogleMember.id;
  })

  afterAll(async () => {
    await dataSource.destroy();

    await app.close();
  })
  
  describe('findMemberByUserIdFromLocal', () => {
    it('정상 조회', async () => {
      const member: Member | null = await memberRepository.findMemberByUserIdFromLocal(localMember.userId);

      expect(member?.userId).toBe(localMember.userId);
      expect(member?.password).toBe(localMember.password);
      expect(member?.username).toBeUndefined();
      expect(member?.nickname).toBeUndefined();
      expect(member?.email).toBeUndefined();
      expect(member?.profile).toBeUndefined();
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
      expect(member?.password).toBeUndefined();
      expect(member?.username).toBeUndefined();
      expect(member?.nickname).toBeUndefined();
      expect(member?.email).toBeUndefined();
      expect(member?.profile).toBeUndefined();
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
      const result: Member | null = await memberRepository.findMemberProfileByUserId(localMember.id);

      expect(result).not.toBeNull();
      expect(result?.nickname).toBe(localMember.nickname);
      expect(result?.email).toBe(localMember.email);
      expect(result?.profile).toBe(localMember.profile);
      expect(result?.password).toBeUndefined();
      expect(result?.username).toBeUndefined();
      expect(result?.id).toBeUndefined();
      expect(result?.userId).toBeUndefined();
    });


    it('존재하지 않는 사용자 조회', async () => {
      const result: Member | null = await memberRepository.findMemberProfileByUserId(999);

      expect(result).toBeNull();
    })
  });

  describe('findNicknameByOAuthUserId', () => {
    it('정상 조회', async () => {
      const result: string | null = await memberRepository.findNicknameByOAuthUserId(googleMember.userId);

      expect(result).toBe(googleMember.nickname);
    });

    it('존재하지 않는 데이터인 경우', async () => {
      const result: string | null = await memberRepository.findNicknameByOAuthUserId('noneUser');

      expect(result).toBeNull();
    })
  })
})