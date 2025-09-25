import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./strategies/local.strategy";

@Module({
	imports: [PassportModule],
	providers: [LocalStrategy],
	exports: [PassportModule],
})
export class PassportConfigModule {}