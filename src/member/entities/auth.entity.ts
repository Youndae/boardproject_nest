import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Member } from "#member/entities/member.entity";

@Entity()
export class Auth extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  auth: string;

  @ManyToOne(() => Member, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false
  })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  member: Member;
}