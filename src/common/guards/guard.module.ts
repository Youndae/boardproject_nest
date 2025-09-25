import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import { MemberModule } from "#member/member.module";
import { AnonymousGuard } from "./anonymous.guard";

@Global()
@Module({
	imports: [MemberModule],
	providers: [RolesGuard, AnonymousGuard],
	exports: [RolesGuard, AnonymousGuard],
})
export class GuardModule {}