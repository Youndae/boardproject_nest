import { Module } from '@nestjs/common';
import { BoardModule } from './board/board.module';
import { ImageBoardModule } from './image-board/image-board.module';
import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';
import { CommentModule } from './comment/comment.module';
import { BoardControllerController } from './board-controller/board-controller.controller';

@Module({
  imports: [BoardModule, ImageBoardModule, AuthModule, MemberModule, CommentModule],
  controllers: [BoardControllerController],
  providers: [],
})
export class AppModule {}
