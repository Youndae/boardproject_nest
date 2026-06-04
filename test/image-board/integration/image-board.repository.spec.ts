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
import { ImageBoardListResponse } from '#imageBoard/dtos/out/image-board-list.response.dto';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { getTotalPages } from '../../utils/pagination.utils';

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

  const boardAmount: number = PAGE_AMOUNT.IMAGE;

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
      for(let i = 0; i < 3; i++) {
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

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(result.items.length).toBe(boardAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.items) {
        expect(listDTO.title.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image0.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('정상 조회. 데이터가 없는 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      await imageDataRepository.deleteAll();
      await imageBoardRepository.deleteAll();

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 제목 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 't';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
      expect(result.items[0].title.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'c';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);
      expect(result.items[0].title.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 제목 or 내용 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'tc';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].title.endsWith('Title11')).toBeTruthy();
    });

    it('정상 조회. 작성자 기반 검색', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = 'test';
      pageDTO.searchType = 'u';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      expect(result.items.length).toBe(boardAmount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(1);

      let objectCount = boardListCount - 1;

      for(const listDTO of result.items) {
        expect(listDTO.title.endsWith(`Title${objectCount}`)).toBeTruthy();
        expect(listDTO.imageName.endsWith(`Image0.jpg`)).toBeTruthy();
        objectCount--;
      };
    });

    it('잘못된 검색 타입을 요청한 경우', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.keyword = '11';
      pageDTO.searchType = 'ab';

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);

      expect(result.items).toStrictEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.isEmpty).toBeTruthy();
      expect(result.currentPage).toBe(1);
    });

    it('정상 조회. 2페이지 조회', async () => {
      const pageDTO: PaginationDTO = new PaginationDTO();
      pageDTO.page = 2;

      const result: ListResponse<ImageBoardListResponse> = await imageBoardRepository.getImageBoardList(pageDTO);
      const totalPageFixture: number = getTotalPages(boardListCount, boardAmount);

      const page2ElementsCount: number = boardListCount - boardAmount;

      expect(result.items.length).toBe(page2ElementsCount);
      expect(result.totalPages).toBe(totalPageFixture);
      expect(result.isEmpty).toBeFalsy();
      expect(result.currentPage).toBe(2);

      let listNumber: number = page2ElementsCount - 1;
      result.items.forEach(dto =>
        expect(dto.title.endsWith(`Title${listNumber--}`))
      );
    });
  });

  describe('getImageBoardDetail', () => {
    it('정상 조회.', async () => {
      const result: ImageBoardDetailResponse | null = await imageBoardRepository.getImageBoardDetail(testBoard.id);

      expect(result).not.toBeNull();
      expect(result?.title).toBe(testBoard.title);
      expect(result?.content).toBe(testBoard.content);
      expect(result?.imageDataList).not.toStrictEqual([]);
      let imageStep: number = 0;
      for(const imageData of result!.imageDataList) {
        expect(imageData).toBe(`board/${testBoard.title}'sImage${imageStep}.jpg`);
        imageStep++;
      }
    });

    it('게시글 번호가 잘못된 경우', async () => {
      const result: ImageBoardDetailResponse | null = await imageBoardRepository.getImageBoardDetail(0);

      expect(result).toBeNull();
    })
  })
})