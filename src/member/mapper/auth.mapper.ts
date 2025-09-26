import { Auth } from "#member/entities/auth.entity";

export class AuthMapper {
	static async toEntityByMember(userId: string) {
		const auth = new Auth();

		auth.userId = userId;
		auth.auth = 'ROLE_MEMBER';

		return auth;
	}
}