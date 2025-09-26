import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./strategies/local.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { KakaoStrategy } from "./strategies/kakao.strategy";
import { NaverStrategy } from "./strategies/naver.strategy";
import { OAuthService } from "../services/oAuth.service";

@Module({
	imports: [PassportModule],
	providers: [
		LocalStrategy,
		GoogleStrategy,
		KakaoStrategy,
		NaverStrategy,
		OAuthService,
	],
	exports: [PassportModule, OAuthService],
})
export class PassportConfigModule {}