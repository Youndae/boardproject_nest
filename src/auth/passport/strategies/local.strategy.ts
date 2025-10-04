import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { MemberRepository } from "#member/repositories/member.repository";
import bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
	private readonly memberRepository: MemberRepository
  ) {
  	super({
	usernameField: 'userId',
	passwordField: 'userPw',
	session: false,
	});
  }

  async validate(userId: string, userPw: string): Promise<any> {
    try {
      const member = await this.memberRepository.findMemberByUserIdFromLocal(userId);

      if(!member){
        return null;
      }

      const isMatch = await bcrypt.compare(userPw, member.userPw);

      if(!isMatch){
        return null;
      }

      console.log('passport local userId : ', userId);

      return { userId };
    }catch(error){
      throw error;
    }
  }
}