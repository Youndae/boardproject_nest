import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardRepository } from '#board/repositories/board.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '#board/entities/board.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Board
    ])
  ],
  controllers: [BoardController],
  providers: [BoardService, BoardRepository]
})
export class BoardModule {}
