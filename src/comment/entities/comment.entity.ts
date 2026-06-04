import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Board } from '#board/entities/board.entity';
import { Member } from '#member/entities/member.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

@Entity({
  name: 'comment',
})
export class Comment extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true})
  id: number;

  @Column({ name: 'board_id', type: 'bigint', unsigned: true, nullable: true })
  boardId: number | null;

  @Column({ name: 'image_board_id', type: 'bigint', unsigned: true, nullable: true })
  imageId: number | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: false, unsigned: true })
  userId: number;

  @Column({ type: 'text', nullable: false })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)'})
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', precision: 3, nullable: true})
  deletedAt: Date | null;

  @Column({ name: 'group_no', type: 'bigint', unsigned: true, nullable: true})
  groupNo: number;

  @Column({ name: 'upper_no', type: 'varchar', length: 255, nullable: true})
  upperNo: string;

  @Column({ type: 'int', nullable: false, default: 1})
  indent: number;

  @ManyToOne(
    () => Board,
    {
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'board_id', referencedColumnName: 'id'})
  board: Board;

  @ManyToOne(
    () => ImageBoard,
    {
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'image_board_id', referencedColumnName: 'id'})
  imageBoard: ImageBoard;

  @ManyToOne(
    () => Member,
    {
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  member: Member;

}