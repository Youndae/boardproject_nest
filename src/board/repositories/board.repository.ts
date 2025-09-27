import { DataSource, Repository } from 'typeorm';
import { Board } from '#board/entities/board.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BoardRepository extends Repository<Board> {
  constructor(private dataSource: DataSource) {
    super(Board, dataSource.manager);
  }
}