import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from '#member/entities/member.entity';

@Entity({
  name: "hierarchicalBoard",
})
export class Board extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  boardNo: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: false})
  boardTitle: string;

  @Column({ type: 'text', nullable: true })
  boardContent: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)'})
  boardDate: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  boardGroupNo: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  boardUpperNo: string;

  @Column({ type: 'int', nullable: false, default: 1})
  boardIndent: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  member: Member;
}