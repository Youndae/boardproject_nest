import { OAuthService } from "#auth/services/oAuth.service";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy as googleStrategy } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(googleStrategy, 'google') {
	constructor(
		private readonly configService: ConfigService,
		private readonly oAuthService: OAuthService,
	) {
		super({
			clientID: configService.get<string>('GOOGLE_ID'),
			clientSecret: configService.get<string>('GOOGLE_SECRET'),
			callbackURL: configService.get<string>('GOOGLE_CALLBACK'),
			scope: ['profile', 'email'],
			session: false,
			prompt: 'consent',
		} as any);
	}

	async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
		const parsedProfile = this.oAuthService.parseGoogleProfile(profile);
		const member = await this.oAuthService.findOrCreateOAuthMember('google', parsedProfile);

		return { userId: member.userId };
	}
}