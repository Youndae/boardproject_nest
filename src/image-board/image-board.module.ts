import { Module } from '@nestjs/common';
import { ImageBoardController } from './image-board.controller';
import { ImageBoardService } from './image-board.service';
import { ImageBoardRepository } from '#imageBoard/repositories/image-board.repository';
import { ImageDataRepository } from '#imageBoard/repositories/image-data.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImageBoard,
      ImageData,
    ])
  ],
  controllers: [ImageBoardController],
  providers: [
    ImageBoardService,
    ImageBoardRepository,
    ImageDataRepository
  ]
})
export class ImageBoardModule {}
