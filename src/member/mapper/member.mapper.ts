import { Member } from "#member/entities/member.entity";
import { uuidv4 } from 'uuidv7';
import bcrypt from 'bcrypt';
import { JoinRequest } from "#member/dtos/in/join.request.dto";

export class MemberMapper {
	static async toEntityByOAuth({
		userId,
		userName,
		email,
		provider,
	}: {
		userId: string,
		userName: string,
		email: string,
		provider: string,
	}) {
		const member = new Member();
		member.userId = userId;
		member.password = await this.encodePassword(uuidv4().replaceAll('-', ''));
		member.username = userName;
		member.email = email;
		member.provider = provider;

		return member;
	}

	static async toEntityByJoinDTO(
    joinDTO: JoinRequest,
    profileThumbnail: { imageName: string, originName: string } | undefined
  ) {
		const member = new Member();

		member.userId = joinDTO.userId;
		member.password = await this.encodePassword(joinDTO.password);
		member.username = joinDTO.userName;
		member.nickname = joinDTO.nickname || null;
		member.email = joinDTO.email;
		member.provider = 'local';
		member.profile = profileThumbnail ? profileThumbnail.imageName : null;

		return member;
	}


  private static async encodePassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}