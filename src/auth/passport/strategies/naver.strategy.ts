import { Injectable } from "@nestjs/common";
import { Strategy as naverStrategy } from "passport-naver";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { OAuthService } from "#auth/services/oAuth.service";


@Injectable()
export class NaverStrategy extends PassportStrategy(naverStrategy, 'naver') {
	constructor(
		private readonly configService: ConfigService,
		private readonly oAuthService: OAuthService,
	) {
		super({
			clientID: configService.get<string>('NAVER_ID'),
			clientSecret: configService.get<string>('NAVER_SECRET'),
			callbackURL: configService.get<string>('NAVER_CALLBACK'),
			scope: ['profile', 'email'],
			session: false,
		} as any);
	}

	async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
		const parsedProfile = this.oAuthService.parseNaverProfile(profile);
		const member = await this.oAuthService.findOrCreateOAuthMember('naver', parsedProfile);

		return { userId: member.userId };
	}
}