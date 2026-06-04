import { DataSource, Repository } from "typeorm";
import { Auth } from "#member/entities/auth.entity";
import { Injectable } from '@nestjs/common';
import { MemberAuthInfo } from '#common/dtos/business/member-auth-info.dto';

@Injectable()
export class AuthRepository extends Repository<Auth> {
  constructor(private dataSource: DataSource) {
    super(Auth, dataSource.manager);
  }

  async getMemberAuthInfo(userId: string): Promise<MemberAuthInfo | undefined> {
    const results = await this.createQueryBuilder('auth')
      .innerJoin('auth.member', 'member')
      .select([
        'member.id',
        'auth.auth'
      ])
      .where('member.userId = :userId', { userId })
      .getMany();

    if(!results || results.length === 0)
      return undefined;

    return new MemberAuthInfo(
      results[0].member.id,
      results.map(r => r.auth)
    );
  }
}