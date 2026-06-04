import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Member extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true})
  id: number;

  @Column({ name: 'user_id', type: 'varchar', length: 100, unique: true, nullable: false })
  userId: string;

  // oauth 사용자는 password가 없으므로 Null 허용 필요.
  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ name: 'user_name', type: 'varchar', length: 50, nullable: false })
  username: string;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 100, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'local'})
  provider: string;

}