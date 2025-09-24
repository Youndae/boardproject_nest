import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardRepository } from '#board/repositories/board.repository';

@Module({
  controllers: [BoardController],
  providers: [BoardService, BoardRepository]
})
export class BoardModule {}
