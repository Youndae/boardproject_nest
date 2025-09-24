import { DataSource, Repository } from 'typeorm';
import { ImageData } from '#imageBoard/entities/image-data.entity';

export class ImageDataRepository extends Repository<ImageData> {
  constructor(private datasource: DataSource) {
    super(ImageData, datasource.manager);
  }
}