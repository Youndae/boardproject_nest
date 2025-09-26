import { BaseEntity, Column, Entity } from 'typeorm';

@Entity()
export class Member extends BaseEntity {
  @Column({ type: 'varchar', length: 50, primary: true })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  userPw: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userName: string;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  nickName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileThumbnail: string | null;

  @Column({ type: 'varchar', length: 45, nullable: false, default: 'local'})
  provider: string;

}