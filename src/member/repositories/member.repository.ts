import { DataSource, Repository } from 'typeorm';
import { Member } from '#member/entities/member.entity';

export class MemberRepository extends Repository<Member> {
  constructor(private dataSource: DataSource) {
    super(Member, dataSource.manager);
  }
}