import { Module } from '@nestjs/common';
import { MemberModule } from '#member/member.module';
import { LoggerModule } from '#config/logger/logger.module';
import { OAuthGuard } from '#common/guards/oauth.guard';

@Module({
  imports: [MemberModule, LoggerModule],
  providers: [OAuthGuard],
  exports: [OAuthGuard],
})
export class OAuthGuardModule {}