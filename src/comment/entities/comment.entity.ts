import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Board } from '#board/entities/board.entity';
import { Member } from '#member/entities/member.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

@Entity({
  name: 'comment',
})
export class Comment extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true})
  commentNo: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  boardNo: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  imageNo: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userId: string;

  @Column({ type: 'text', nullable: false })
  commentContent: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)'})
  commentDate: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true})
  commentGroupNo: number;

  @Column({ type: 'varchar', length: 200, nullable: true})
  commentUpperNo: string;

  @Column({ type: 'int', nullable: false, default: 1})
  commentIndent: number;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'boardNo', referencedColumnName: 'boardNo'})
  board: Board;

  @ManyToOne(() => ImageBoard)
  @JoinColumn({ name: 'imageNo', referencedColumnName: 'imageNo'})
  imageBoard: ImageBoard;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  member: Member;

}