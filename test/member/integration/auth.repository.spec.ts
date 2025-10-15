import { AuthRepository } from '#member/repositories/auth.repository';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { MemberRepository } from '#member/repositories/member.repository';
import { Member } from '#member/entities/member.entity';
import { Auth } from '#member/entities/auth.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { MemberModule } from '#member/member.module';

describe('authRepository', () => {
  let memberRepository: MemberRepository;
  let authRepository: AuthRepository;
  let dataSource: DataSource;
  let app: INestApplication;

  const saveMember: Member = new Member();
  const saveAdmin: Member = new Member();
  const authArray: string[] = ['ROLE_MEMBER', 'ROLE_MANAGER', 'ROLE_ADMIN'];

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        MemberModule,
      ],
      providers: [
        MemberRepository,
        AuthRepository
      ]
    }).compile();

    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  beforeEach(async () => {
    await authRepository.deleteAll();
    await memberRepository.deleteAll();

    saveMember.userId = 'tester';
    saveMember.userPw = '1234';
    saveMember.userName = 'testerName';
    saveMember.nickName = 'testerNickname';
    saveMember.email = 'tester@tester.com';
    saveMember.profileThumbnail = 'localProfileName.jpg';
    saveMember.provider = 'local';

    saveAdmin.userId = 'admin';
    saveAdmin.userPw = '1234';
    saveAdmin.userName = 'adminName';
    saveAdmin.nickName = 'adminNickname';
    saveAdmin.email = 'admin@admin.com';
    saveAdmin.profileThumbnail = 'adminProfileName.jpg';
    saveAdmin.provider = 'local';

    const createSaveMember: Member[] = [
      memberRepository.create(saveMember),
      memberRepository.create(saveAdmin)
    ];

    const saveAdminAuths: Auth[] = authArray.map(role =>
      authRepository.create({
        userId: saveAdmin.userId,
        auth: role,
      })
    );

    saveAdminAuths.push(authRepository.create({
      userId: saveMember.userId,
      auth: authArray[0],
    }));

    await memberRepository.save(createSaveMember);
    await authRepository.save(saveAdminAuths);
  });

  afterAll(async () => {
    await authRepository.deleteAll();
    await memberRepository.deleteAll();
    await dataSource.destroy();

    await app.close();
  })

  describe('getMemberAuths', () => {
    it('일반 사용자 권한 조회', async () => {
      const auth: string[] = await authRepository.getMemberAuths(saveMember.userId);

      expect(auth.length).toBe(1);
      expect(auth[0]).toBe('ROLE_MEMBER');
    });

    it('관리자 권한 조회', async () => {
      const auth: string[] = await authRepository.getMemberAuths(saveAdmin.userId);

      expect(auth.length).toBe(3);
      for(let i = 0; i < auth.length; i++)
        expect(auth[i]).toBe(authArray[i]);
    });

    it('데이터가 없는 경우', async() => {
      const auth: string[] = await authRepository.getMemberAuths('noneUser');

      expect(auth.length).toBe(0);
    })
  });
})