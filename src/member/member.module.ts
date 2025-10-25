import { Module } from '@nestjs/common';
import { MemberController } from './controllers/member.controller';
import { MemberService } from './services/member.service';
import { AuthRepository } from '#member/repositories/auth.repository';
import { MemberRepository } from './repositories/member.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '#member/entities/member.entity';
import { Auth } from '#member/entities/auth.entity';
import { FileModule } from '#src/file/file.module';
import { LoggerModule } from '#config/logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { GuardModule } from '#common/guards/guard.module';

@Module({
	imports: [
    TypeOrmModule.forFeature([
      Member,
      Auth
    ]),
    FileModule,
    LoggerModule,
    ConfigModule,
    GuardModule
  ],
	controllers: [MemberController],
	providers: [
    MemberService,
    AuthRepository,
    MemberRepository
  ],
	exports: [
    AuthRepository,
    MemberRepository
  ]
})
export class MemberModule {}
