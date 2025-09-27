import { Injectable } from "@nestjs/common";
import { MemberRepository } from "#member/repositories/member.repository";
import { AuthRepository } from "#member/repositories/auth.repository";
import { LoggerService } from "#config/logger/logger.service";
import { v4 as uuidv4 } from 'uuid';
import { Transactional } from "typeorm-transactional";
import { MemberMapper } from "#member/mapper/member.mapper";
import { AuthMapper } from "#member/mapper/auth.mapper";

interface ParsedProfile {
	userId: string;
	email: string | null;
	username: string;
}

@Injectable()
export class OAuthService {
	constructor(
		private readonly memberRepository: MemberRepository,
		private readonly authRepository: AuthRepository,
		private readonly logger: LoggerService
	) {}

	parseGoogleProfile(profile: any): ParsedProfile {
		return {
			userId: `google_${profile.id}`,
			email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
			username: profile.displayName || `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`,
		};
	}

	parseKakaoProfile(profile: any): ParsedProfile {
		return {
			userId: `kakao_${profile.id}`,
			email: profile.kakao_account?.email || null,
			username: profile._json?.kakao_account?.profile?.nickname,
		}
	}

	parseNaverProfile(profile: any): ParsedProfile {
		return {
			userId: `naver_${profile.id}`,
			email: profile._json?.email || (profile.emails?.[0]?.value || null),
			username: profile._json?.nickname || profile.displayName || `naver_${uuidv4().replaceAll('-', '').slice(0, 5)}`,
		};
	}

	@Transactional()
	async findOrCreateOAuthMember(provider: string, parsedProfile: ParsedProfile) {
		try {
			const { userId, email, username } = parsedProfile;

			let member = await this.memberRepository.findOAuthMember(provider, userId);

			if(!member) {
				member = await MemberMapper.toEntityByOAuth({
					userId,
					email: email!,
					userName: username,
					provider,
				});

				const auth = AuthMapper.toEntityByMember(userId);

				await this.memberRepository.save(member);
				await this.authRepository.save(auth);
			}

			return member;
		}catch(error) {
			this.logger.error('Failed to find or create OAuth Member', error);
			throw error;
		}
	}
}