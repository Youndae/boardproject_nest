import { Module } from '@nestjs/common';
import { MemberController } from './controllers/member.controller';
import { MemberService } from './services/member.service';
import { AuthRepository } from '#member/repositories/auth.repository';

@Module({
  controllers: [MemberController],
  providers: [MemberService, AuthRepository],
  exports: [AuthRepository]
})
export class MemberModule {}
