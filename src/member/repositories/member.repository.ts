import { DataSource, Repository } from 'typeorm';
import { Member } from '#member/entities/member.entity';

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
}