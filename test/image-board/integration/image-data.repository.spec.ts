import { MemberRepository } from '#member/repositories/member.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { Member } from '#member/entities/member.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { MemberModule } from '#member/member.module';
import { ImageBoardModule } from '#imageBoard/image-board.module';

describe('imageDataRepository', () => {
  let memberRepository: MemberRepository;
  let imageBoardRepository: ImageBoardRepository;
  let imageDataRepository: ImageDataRepository;
  let dataSource: DataSource;
  let app: INestApplication;

  let testBoard: ImageBoard;
  let testBoardImageData: string[];
  let boardListCount: number = 20;
  const member: Member = new Member();

  const boardAmount: number = 15;

  beforeAll(async () => {
    initializeTransactionalContext();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        MemberModule,
        ImageBoardModule
      ],
      providers: [
        ImageDataRepository,
        ImageBoardRepository,
        MemberRepository
      ]
    }).compile();

    memberRepository = moduleFixture.get<MemberRepository>(MemberRepository);
    imageBoardRepository = moduleFixture.get<ImageBoardRepository>(ImageBoardRepository);
    imageDataRepository = moduleFixture.get<ImageDataRepository>(ImageDataRepository);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    app = moduleFixture.createNestApplication();
    await app.init();

    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    member.userId = 'tester';
    member.password = '1234';
    member.username = 'testerName';
    member.nickname = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profile = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    const savedMember: Member = await memberRepository.save(saveMember);
    member.id = savedMember.id;
  });

  beforeEach(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();

    const imageBoardArr: ImageBoard[] = [];
    const imageDataArr: ImageData[] = [];

    for(let i  = 0; i < boardListCount; i++) {
      imageBoardArr.push(
        imageBoardRepository.create({
          userId: member.id,
          title: `testImageTitle${i}`,
          content: `testImageContent${i}`
        })
      );
    };

    const saveImageBoardList: ImageBoard[] = await imageBoardRepository.save(imageBoardArr);

    for(const saveBoard of saveImageBoardList) {
      for(let i = 1; i <= 3; i++) {
        imageDataArr.push(
          imageDataRepository.create({
            imageName: `board/${saveBoard.title}'sImage${i}.jpg`,
            imageId: saveBoard.id,
            originName: `${saveBoard.title}'sOriginName${i}.jpg`,
            imageStep: i
          })
        );
      }
    }

    const saveImageDataList: ImageData[] = await imageDataRepository.save(imageDataArr);

    testBoard = saveImageBoardList[0];
    testBoardImageData = saveImageDataList
                          .filter(e => e.imageId === testBoard.id)
                          .map(dto => dto.imageName);
  })

  afterAll(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    await dataSource.destroy();
    await app.close();
  });

  describe('getImageNameListByImageNo', () => {
    it('정상 조회', async() => {
      const result: string[] = await imageDataRepository.getImageNameListByImageNo(testBoard.id);

      expect(result).not.toStrictEqual([]);
      expect(result.length).toBe(testBoardImageData.length);

      result.forEach(name => expect(testBoardImageData.includes(name)).toBeTruthy());
    });

    it('데이터가 없는 경우', async () => {
      await imageDataRepository.deleteAll();
      const result: string[] = await imageDataRepository.getImageNameListByImageNo(testBoard.id);

      expect(result).toStrictEqual([]);
    })
  });

  describe('findAllByImageId', () => {
    it('정상 조회', async() => {
      const result: ImageData[] = await imageDataRepository.findAllByImageId(testBoard.id);

      expect(result).not.toStrictEqual([]);
      expect(result.length).toBe(3);
      let imageStep = 1;
      result.forEach(entity => expect(entity.imageStep).toBe(imageStep++));
    })
  })
});