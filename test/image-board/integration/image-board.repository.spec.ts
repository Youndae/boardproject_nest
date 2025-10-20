import { MemberRepository } from '#member/repositories/member.repository';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../module/testDatabase.module';
import { MemberModule } from '#member/member.module';
import { ImageBoardModule } from '#imageBoard/image-board.module';
import { Member } from '#member/entities/member.entity';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { ImageBoardListResponseDTO } from '#imageBoard/dtos/out/image-board-list-response.dto';

describe('imageBoardRepository', () => {
  let memberRepository: MemberRepository;
  let imageBoardRepository: ImageBoardRepository;
  let imageDataRepository: ImageDataRepository;
  let dataSource: DataSource;
  let app: INestApplication;

  let testBoard: ImageBoard;
  let testBoardImageData: ImageData[];
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
    member.userPw = '1234';
    member.userName = 'testerName';
    member.nickName = 'testerNickname';
    member.email = 'tester@tester.com';
    member.profileThumbnail = 'localProfileName.jpg';
    member.provider = 'local';

    const saveMember: Member = memberRepository.create(member);
    await memberRepository.save(saveMember);
  });

  beforeEach(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();

    const imageBoardArr: ImageBoard[] = [];
    const imageDataArr: ImageData[] = [];

    for(let i  = 0; i < boardListCount; i++) {
      imageBoardArr.push(
        imageBoardRepository.create({
          userId: member.userId,
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
            oldName: `${saveBoard.imageTitle}'sOriginName.jpg`,
            imageStep: i
          })
        );
      }
    }

    const saveImageDataList: ImageData[] = await imageDataRepository.save(imageDataArr);

    testBoard = saveImageBoardList[0];
    testBoardImageData = [saveImageDataList[0], saveImageDataList[1], saveImageDataList[2]];
  })

  afterAll(async () => {
    await imageDataRepository.deleteAll();
    await imageBoardRepository.deleteAll();
    await memberRepository.deleteAll();

    await dataSource.destroy();
    await app.close();
  })

  describe('getImageBoardList', () => {
    it('정상 조회. 검색어 없음.', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list.length).toBe(boardAmount);
      expect(result.totalElements).toBe(boardListCount);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.list) {
        expect(listDTO.imageTitle.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image0.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      await imageDataRepository.deleteAll();
      await imageBoardRepository.deleteAll();

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it('정상 조회. 제목 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
      expect(result.list[0].imageTitle.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'c';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
      expect(result.list[0].imageTitle.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'tc';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list.length).toBe(1);
      expect(result.totalElements).toBe(1);
      expect(result.list[0].imageTitle.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = 'test';
      pageDTO.searchType = 'u';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list.length).toBe(boardAmount);
      expect(result.totalElements).toBe(boardListCount);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.list) {
        expect(listDTO.imageTitle.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image0.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('잘못된 검색 타입을 요청한 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'ab';

      const result: {
        list: ImageBoardListResponseDTO[],
        totalElements: number
      } = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.list).toStrictEqual([]);
      expect(result.totalElements).toBe(0);
    });
  });


})