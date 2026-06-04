import { Brackets, DataSource, Repository } from 'typeorm';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { Injectable } from '@nestjs/common';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { getPaginationOffset, setKeyword } from '#common/utils/pagination-offset.utils';
import { ImageBoardListResponse } from '#imageBoard/dtos/out/image-board-list.response.dto';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';
import { PAGE_AMOUNT } from '#common/constants/common-page-amount.constants';

@Injectable()
export class ImageBoardRepository extends Repository<ImageBoard> {
  constructor(private dataSource: DataSource) {
    super(ImageBoard, dataSource.manager);
  }

  async getImageBoardList(pageDTO: PaginationDTO): Promise<ListResponse<ImageBoardListResponse>> {
    const imageAmount = PAGE_AMOUNT.IMAGE;
    const offset: number = getPaginationOffset(pageDTO.page, imageAmount);
    const keyword: string = setKeyword(pageDTO.keyword);

    const query = this.createQueryBuilder('imageBoard')
      .innerJoin('imageBoard.imageDatas', 'imageDatas')
      .leftJoin('imageBoard.member', 'member')
      .select([
        'imageBoard.id',
        'imageBoard.title'
      ])
      .addSelect('imageBoard.id', 'targetId')
      .addSelect('MIN(imageDatas.image_name)', 'imageName')
      .groupBy('imageBoard.id')
      .skip(offset)
      .take(imageAmount)
      .orderBy('imageBoard.id', 'DESC');

    let isSearchable = true;

    if(keyword) {
      const validSearchTypes = ['t', 'c', 'tc', 'u'];

      if(!pageDTO.searchType || !validSearchTypes.includes(pageDTO.searchType))
        isSearchable = false;
      else {
        query.andWhere(new Brackets((qb) => {
          if(pageDTO.searchType === 't' || pageDTO.searchType === 'tc')
            qb.orWhere('imageBoard.title LIKE :keyword');

          if(pageDTO.searchType === 'c' || pageDTO.searchType === 'tc')
            qb.orWhere('imageBoard.content LIKE :keyword');

          if(pageDTO.searchType === 'u')
            qb.orWhere('member.nickname LIKE :keyword')
        }), { keyword })
      }
    }

    if(!isSearchable)
      return new ListResponse([], 0, imageAmount, pageDTO.page);

    const { entities, raw } = await query.getRawAndEntities();
    const totalElements = await query.getCount();

    const list: ImageBoardListResponse[] = entities.map(
      (entity: ImageBoard): ImageBoardListResponse => {
        const rawData = raw.find(r => r.targetId === entity.id);
        const imageName = rawData.imageName;
        return new ImageBoardListResponse(entity, imageName);
      });

    return new ListResponse(list, totalElements, imageAmount, pageDTO.page);
  }

  async getImageBoardDetail(id: number): Promise<ImageBoardDetailResponse | null> {
    const board = await this.createQueryBuilder('imageBoard')
      .leftJoinAndSelect('imageBoard.imageDatas', 'imageDatas')
      .leftJoinAndSelect('imageBoard.member', 'member')
      .where('imageBoard.id = :id', { id })
      .orderBy('imageDatas.imageStep', 'ASC')
      .getOne();

    if(!board)
      return null;

    return new ImageBoardDetailResponse(board);
  }

  async findUserIdById(id: number): Promise<number | null> {
    const board = await this.createQueryBuilder('imageBoard')
      .select(['imageBoard.userId'])
      .where({ id })
      .getOne();

    return board ? board.userId : null;
  }

  async findById(id: number): Promise<ImageBoard | null> {
    return await this.createQueryBuilder('imageBoard')
      .where({ id })
      .getOne();
  }
}