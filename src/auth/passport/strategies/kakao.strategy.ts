import { Injectable } from "@nestjs/common";
import { Strategy as kakaoStrategy } from "passport-kakao";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { OAuthService } from "#auth/services/oAuth.service";

@Injectable()
export class KakaoStrategy extends PassportStrategy(kakaoStrategy, 'kakao') {
	constructor(
		private readonly configService: ConfigService,
		private readonly oAuthService: OAuthService,
	) {
		super({
			clientID: configService.get<string>('KAKAO_ID'),
			clientSecret: configService.get<string>('KAKAO_SECRET'),
			callbackURL: configService.get<string>('KAKAO_CALLBACK'),
			scope: ['profile_nickname', 'account_email'],
			session: false,
		} as any);
	}

	async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
		const parsedProfile = this.oAuthService.parseKakaoProfile(profile);
		const member = await this.oAuthService.findOrCreateOAuthMember('kakao', parsedProfile);

		return { userId: member.userId };
	}
}