import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import { MemberModule } from "#member/member.module";
import { AnonymousGuard } from "./anonymous.guard";
import { LoggerModule } from '#config/logger/logger.module';

@Global()
@Module({
	imports: [MemberModule, LoggerModule],
	providers: [RolesGuard, AnonymousGuard],
	exports: [RolesGuard, AnonymousGuard],
})
export class GuardModule {}