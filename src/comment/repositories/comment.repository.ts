import { DataSource, Repository } from 'typeorm';
import { Comment } from '#comment/entities/comment.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CommentRepository extends Repository<Comment>{
  constructor(private dataSource: DataSource) {
    super(Comment, dataSource.manager);
  }
}