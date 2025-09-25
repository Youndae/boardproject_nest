import { Module } from '@nestjs/common';
import { MemberController } from './controllers/member.controller';
import { MemberService } from './services/member.service';
import { AuthRepository } from '#member/repositories/auth.repository';
import { MemberRepository } from './repositories/member.repository';

@Module({
  controllers: [MemberController],
  providers: [MemberService, AuthRepository, MemberRepository],
  exports: [AuthRepository, MemberRepository]
})
export class MemberModule {}
