import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Member } from "#member/model/entity/member.entity";

@Entity()
export class Auth extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  userId: string;

  @Column({ type: 'varchar', nullable: false })
  auth: string;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  member: Member;
}