import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { AuthRepository } from '#member/auth.repository';

@Module({
  controllers: [MemberController],
  providers: [MemberService, AuthRepository],
  exports: [AuthRepository]
})
export class MemberModule {}
