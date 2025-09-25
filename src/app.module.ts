import { Module } from '@nestjs/common';
import { BoardModule } from '#board/board.module';
import { ImageBoardModule } from '#imageBoard/image-board.module';
import { AuthModule } from '#auth/auth.module';
import { MemberModule } from '#member/member.module';
import { CommentModule } from '#comment/comment.module';
import { JwtAuthGuard } from '#common/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '#config/logger/logger.module';
import { RedisModule } from '#config/redis/redis.module';
import { DatabaseModule } from '#config/db/typeorm.module';
import { GuardModule } from '#common/guards/guard.module';

@Module({
  imports: [
	ConfigModule.forRoot({ isGlobal: true }),
	LoggerModule,
	RedisModule,
	DatabaseModule,
	GuardModule,
	BoardModule, 
	ImageBoardModule, 
	AuthModule, 
	MemberModule, 
	CommentModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    }
  ],
})
export class AppModule {}
