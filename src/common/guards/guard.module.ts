import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import { AnonymousGuard } from "./anonymous.guard";
import { LoggerModule } from '#config/logger/logger.module';

@Global()
@Module({
	imports: [LoggerModule],
	providers: [RolesGuard, AnonymousGuard],
	exports: [RolesGuard, AnonymousGuard],
})
export class GuardModule {}