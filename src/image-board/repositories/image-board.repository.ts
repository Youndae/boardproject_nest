import { DataSource, Repository } from 'typeorm';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

export class ImageBoardRepository extends Repository<ImageBoard> {
  constructor(private dataSource: DataSource) {
    super(ImageBoard, dataSource.manager);
  }
}