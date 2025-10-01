import { DataSource, Repository } from 'typeorm';
import { Member } from '#member/entities/member.entity';
import { Injectable } from '@nestjs/common';
import { ProfileResponseDTO } from '#member/dtos/out/profileResponse.dto';

@Injectable()
export class MemberRepository extends Repository<Member> {
  constructor(private dataSource: DataSource) {
    super(Member, dataSource.manager);
  }

  async findMemberByUserIdFromLocal(userId: string): Promise<Member | null> {
    const result = await this.findOne({
      where: { userId, provider: 'local' },
      select: ['userId', 'userPw']
    });

    return result;
  }

  async findOAuthMember(provider: string, userId: string): Promise<Member | null> {
    const result: Member | null = await this.findOne({
      where: { userId, provider },
      select: ['userId']
    });

    return result;
  }

  async findUserId(userId: string): Promise<string | null> {
    const result: Member | null = await this.findOne({
      where: { userId },
      select: ['userId']
    });

    return result?.userId ?? null;
  }

  async findMemberProfileByUserId(userId: string): Promise<ProfileResponseDTO> {
    const result = await this.createQueryBuilder('member')
      .select([
        'member.nickName AS nickName',
        'member.profileThumbnail AS profileThumbnail',
      ])
      .where('member.userId = :userId', { userId })
      .getRawOne<{ nickName: string; profileThumbnail: string }>();

    return new ProfileResponseDTO(result?.nickName, result?.profileThumbnail);
  }
  
}