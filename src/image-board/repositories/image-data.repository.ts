import { DataSource, Repository } from 'typeorm';
import { ImageData } from '#imageBoard/entities/image-data.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageDataRepository extends Repository<ImageData> {
  constructor(private datasource: DataSource) {
    super(ImageData, datasource.manager);
  }

  async getImageNameListByImageNo(imageNo: number): Promise<string[]> {
    const result: ImageData[] = await this.find({
      select: ['imageName'],
      where: { imageNo }
    });

    return result.map((entity) => entity.imageName);
  }
}