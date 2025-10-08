import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./strategies/local.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { KakaoStrategy } from "./strategies/kakao.strategy";
import { NaverStrategy } from "./strategies/naver.strategy";
import { OAuthService } from "../services/oAuth.service";
import { MemberModule } from '#member/member.module';
import { LoggerModule } from '#config/logger/logger.module';
import { ConfigModule } from '@nestjs/config';

@Module({
	imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MemberModule,
    LoggerModule,
    ConfigModule
  ],
	providers: [
    LocalStrategy,
    GoogleStrategy,
    KakaoStrategy,
    NaverStrategy,
    OAuthService
  ],
	exports: [PassportModule],
})
export class PassportConfigModule {}