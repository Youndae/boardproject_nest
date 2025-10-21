import { Module } from '@nestjs/common';
import { CommentController } from './controller/comment.controller';
import { CommentService } from './services/comment.service';
import { CommentRepository } from '#comment/repositories/comment.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from '#comment/entities/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Comment
    ])
  ],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository]
})
export class CommentModule {}
