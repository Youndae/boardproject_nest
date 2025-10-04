import { Member } from "#member/entities/member.entity";
import { uuidv4 } from 'uuidv7';
import bcrypt from 'bcrypt';
import { JoinDTO } from "#member/dtos/in/join.dto";

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
		member.userPw = await bcrypt.hash(uuidv4().replaceAll('-', ''), 10);
		member.userName = userName;
		member.email = email;
		member.provider = provider;

		return member;
	}

	static async toEntityByJoinDTO(
    joinDTO: JoinDTO,
    profileThumbnail: { imageName: string, originName: string } | undefined
  ) {
		const member = new Member();

		member.userId = joinDTO.userId;
		member.userPw = await bcrypt.hash(joinDTO.userPw, 10);
		member.userName = joinDTO.userName;
		member.nickName = joinDTO.nickName || null;
		member.email = joinDTO.email;
		member.provider = 'local';
		member.profileThumbnail = `profile/${profileThumbnail?.imageName}` || null;

		return member;
	}
}