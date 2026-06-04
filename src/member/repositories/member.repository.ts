import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Member } from '#member/entities/member.entity';

@Injectable()
export class MemberRepository extends Repository<Member> {
  constructor(private dataSource: DataSource) {
    super(Member, dataSource.manager);
  }

  async findMemberByUserIdFromLocal(userId: string): Promise<Member | null> {
    return await this.findOne({
      where: { userId, provider: 'local' },
      select: ['userId', 'password']
    });
  }

  async findOAuthMember(provider: string, userId: string): Promise<Member | null> {
    if(provider === 'local') return null;

    return await this.findOne({
      where: { userId, provider },
      select: ['userId']
    });
  }

  async findUserId(userId: string): Promise<string | null> {
    const result: Member | null = await this.findOne({
      where: { userId },
      select: ['userId']
    });

    return result?.userId ?? null;
  }

  async findMemberProfileByUserId(userId: number): Promise<Member | null> {
    return await this.createQueryBuilder('member')
              .select([
                'member.nickname',
                'member.email',
                'member.profile',
              ])
              .where('member.id = :userId', { userId })
              .getOne();
  }

  async findNicknameByOAuthUserId(userId: string): Promise<string | null> {
    const result: Member | null = await this.findOne({
      where: { userId },
      select: ['nickname']
    });

    return result?.nickname ?? null;
  }
}