import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { MemberRepository } from "#member/repositories/member.repository";
import bcrypt from 'bcrypt';
import { MemberAuthInfo } from '#common/dtos/business/member-auth-info.dto';
import { InternalServerErrorException } from '#common/exceptions/internal-server-error.exception';
import { getHighestRole } from '#common/utils/auth.utils';
import { AuthRepository } from '#member/repositories/auth.repository';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
	private readonly memberRepository: MemberRepository,
  private readonly authRepository: AuthRepository,
  ) {
  	super({
	usernameField: 'userId',
	passwordField: 'password',
	session: false,
	});
  }

  async validate(userId: string, password: string): Promise<any> {
    try {
      const member = await this.memberRepository.findMemberByUserIdFromLocal(userId);

      if(!member){
        return null;
      }

      const isMatch = await bcrypt.compare(password, member.password!);

      if(!isMatch){
        return null;
      }

      const memberInfo: MemberAuthInfo | undefined = await this.authRepository.getMemberAuthInfo(userId);

      if(!memberInfo)
        throw new InternalServerErrorException();

      const highestRole: string = getHighestRole(memberInfo.roles);

      return {
        userId,
        role: highestRole,
      };
    }catch(error){
      throw error;
    }
  }
}