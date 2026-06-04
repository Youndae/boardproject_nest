import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from '#member/entities/member.entity';

@Entity({
  name: "board",
})
export class Board extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: false, unsigned: true })
  userId: number;

  @Column({ type: 'varchar', length: 200, nullable: false})
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)'})
  createdAt: Date;

  @Column({ name: 'group_no', type: 'bigint', unsigned: true, nullable: true })
  groupNo: number;

  @Column({ name: 'upper_no', type: 'varchar', length: 255, nullable: true })
  upperNo: string;

  @Column({ type: 'int', nullable: false, default: 0})
  indent: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  member: Member;
}