import { DataSource, Repository } from 'typeorm';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageDataRepository extends Repository<ImageData> {
  constructor(private datasource: DataSource) {
    super(ImageData, datasource.manager);
  }

  async getImageNameListByImageNo(imageId: number): Promise<string[]> {
    const result: ImageData[] = await this.find({
      select: ['imageName'],
      where: { imageId }
    });

    return result.map((entity) => entity.imageName);
  }

  async findAllByImageId(imageId: number): Promise<ImageData[]> {
    return await this.createQueryBuilder('imageData')
      .where('imageData.imageId = :imageId', { imageId })
      .orderBy('imageData.imageStep', 'ASC')
      .getMany();
  }
}