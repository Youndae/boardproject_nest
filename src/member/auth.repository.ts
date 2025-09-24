import { DataSource, Repository } from "typeorm";
import { Auth } from "#member/model/entity/auth.entity";

export class AuthRepository extends Repository<Auth> {
  constructor(private dataSource: DataSource) {
    super(Auth, dataSource.manager);
  }

  async getMemberAuths(userId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('auth')
      .select('auth.auth')
      .where('auth.userId = :userId', { userId })
      .getRawMany();

    return result.map(row => row.auth);
  }
}