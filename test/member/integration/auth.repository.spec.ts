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
import { MemberAuthInfo } from '#common/dtos/business/member-auth-info.dto';

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
    saveMember.password = '1234';
    saveMember.username = 'testerName';
    saveMember.nickname = 'testerNickname';
    saveMember.email = 'tester@tester.com';
    saveMember.profile = 'localProfileName.jpg';
    saveMember.provider = 'local';

    saveAdmin.userId = 'admin';
    saveAdmin.password = '1234';
    saveAdmin.username = 'adminName';
    saveAdmin.nickname = 'adminNickname';
    saveAdmin.email = 'admin@admin.com';
    saveAdmin.profile = 'adminProfileName.jpg';
    saveAdmin.provider = 'local';

    const createSaveMember: Member[] = [
      memberRepository.create(saveMember),
      memberRepository.create(saveAdmin)
    ];
    const savedMembers: Member[] = await memberRepository.save(createSaveMember);
    saveMember.id = savedMembers[0].id;
    saveAdmin.id = savedMembers[1].id;

    const saveAdminAuths: Auth[] = authArray.map(role =>
      authRepository.create({
        userId: saveAdmin.id,
        auth: role,
      })
    );

    saveAdminAuths.push(authRepository.create({
      userId: saveMember.id,
      auth: authArray[0],
    }));

    await authRepository.save(saveAdminAuths);
  });

  afterAll(async () => {
    await authRepository.deleteAll();
    await memberRepository.deleteAll();
    await dataSource.destroy();

    await app.close();
  })

  describe('getMemberAuthInfo', () => {
    it('일반 사용자 권한 조회', async () => {
      const result: MemberAuthInfo | undefined = await authRepository.getMemberAuthInfo(saveMember.userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(saveMember.id);
      expect(result?.roles).not.toStrictEqual([]);
      expect(result?.roles.length).toBe(1);
      expect(result?.roles[0]).toBe('ROLE_MEMBER');
    });

    it('관리자 권한 조회', async () => {
      const result: MemberAuthInfo | undefined = await authRepository.getMemberAuthInfo(saveAdmin.userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(saveAdmin.id);
      expect(result?.roles).not.toStrictEqual([]);
      expect(result?.roles.length).toBe(authArray.length);
      for(let i = 0; i < result!.roles.length; i++)
        expect(result?.roles[i]).toBe(authArray[i]);
    });

    it('데이터가 없는 경우', async() => {
      const result: MemberAuthInfo | undefined = await authRepository.getMemberAuthInfo('noneUser');

      expect(result).toBeUndefined();
    })
  });
})