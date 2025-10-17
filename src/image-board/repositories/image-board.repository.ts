import { DataSource, Like, Repository } from 'typeorm';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { Injectable } from '@nestjs/common';
import { PaginationDTO } from '#common/dtos/in/pagination.dto';
import { getPaginationOffset, setKeyword } from '#common/utils/pagination-offset.utils';
import { ImageBoardListResponseDTO } from '#imageBoard/dtos/out/image-board-list-response.dto';
import { ImageBoardListRowType } from '#imageBoard/types/image-board-list.type';
import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';

const imageAmount: number = 15;

@Injectable()
export class ImageBoardRepository extends Repository<ImageBoard> {
  constructor(private dataSource: DataSource) {
    super(ImageBoard, dataSource.manager);
  }

  async getImageBoardList(pageDTO: PaginationDTO): Promise<{
    list: ImageBoardListResponseDTO[],
    totalElements: number
  }> {
    const offset: number = getPaginationOffset(pageDTO.pageNum, imageAmount);
    const keyword: string = setKeyword(pageDTO.keyword);
    let whereClause = '';
    let countClause = {};
    const param: any[] = [];

    if(keyword){
      switch (pageDTO.searchType) {
        case 't':
            whereClause = 'WHERE ib.imageTitle LIKE ?';
            countClause = { imageTitle: Like(keyword) };
            param.push(keyword);
            break;
        case 'c':
            whereClause =  'WHERE ib.imageContent LIKE ?';
            countClause = { imageContent: Like(keyword) };
            param.push(keyword);
            break;
        case 'tc':
            whereClause = 'WHERE ib.imageTitle LIKE ? OR ib.imageContent LIKE ?';
            countClause = [
              { imageTitle: Like(keyword) },
              { imageContent: Like(keyword) },
            ];
            param.push(keyword, keyword);
            break;
        case 'u':
            whereClause = 'WHERE ib.userId LIKE ?';
            countClause = { userId: Like(keyword) };
            param.push(keyword);
            break;
        default:
            break;
      }
    }

    param.push(imageAmount, offset);

    const query = `
      WITH image_datas AS (
        SELECT
          imageNo,
          imageName,
          ROW_NUMBER() OVER (PARTITION BY imageNo ORDER BY imageStep ASC) AS rn
        FROM imageData
      )
      SELECT
        ib.imageNo AS imageNo,
        ib.imageTitle AS imageTitle,
        ib.userId AS userId,
        ib.imageDate AS imageDate,
        id.imageName AS imageName
      FROM imageBoard ib
      LEFT JOIN image_datas id
      ON ib.imageNo = id.imageNo AND id.rn = 1
      ${whereClause}
      ORDER BY ib.imageNo DESC
      LIMIT ? OFFSET ?;
    `;


    const lists = await this.query(query, param) as ImageBoardListRowType[];
    const list: ImageBoardListResponseDTO[] = lists.map(
      (entity: ImageBoardListRowType) => new ImageBoardListResponseDTO(entity)
    );
    const totalElements: number = await this.count({ where: countClause });

    return { list, totalElements };
  }

  async getImageBoardDetail(imageNo: number): Promise<ImageBoardDetailResponseDTO | null> {
    const boardDetail: ImageBoard | null = await this.createQueryBuilder('ib')
      .leftJoinAndSelect('ib.imageDatas', 'id')
      .where('ib.imageNo = :imageNo', { imageNo })
      .orderBy('id.imageStep', 'ASC')
      .getOne();

    if(!boardDetail)
      return null;

    return new ImageBoardDetailResponseDTO(boardDetail);
  }
}