import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Member } from "#member/entities/member.entity";

@Entity()
export class Auth extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: false, unsigned: true })
  userId: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  auth: string;

  @ManyToOne(() => Member, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  member: Member;
}