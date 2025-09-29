import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import { MemberModule } from "#member/member.module";
import { AnonymousGuard } from "./anonymous.guard";
import { LoggerModule } from '#config/logger/logger.module';
import { OAuthGuard } from '#common/guards/oauth.guard';

@Global()
@Module({
	imports: [MemberModule, LoggerModule],
	providers: [RolesGuard, AnonymousGuard, OAuthGuard],
	exports: [RolesGuard, AnonymousGuard, OAuthGuard],
})
export class GuardModule {}