import { Auth } from "#member/entities/auth.entity";

export class AuthMapper {
	static toEntityByMember(userId: number) {
		const auth = new Auth();

		auth.userId = userId;
		auth.auth = 'ROLE_MEMBER';

		return auth;
	}
}