import { Module } from '@nestjs/common';
import { ImageBoardController } from './image-board.controller';
import { ImageBoardService } from './image-board.service';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';

@Module({
  controllers: [ImageBoardController],
  providers: [
    ImageBoardService,
    ImageBoardRepository,
    ImageDataRepository
  ]
})
export class ImageBoardModule {}
