import { Module } from '@nestjs/common';
import { ImageBoardController } from './image-board.controller';
import { ImageBoardService } from './image-board.service';

@Module({
  controllers: [ImageBoardController],
  providers: [ImageBoardService]
})
export class ImageBoardModule {}
