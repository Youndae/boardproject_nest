import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '#member/entities/member.entity';
import { ImageData } from '#imageBoard/entities/image-data.entity';

@Entity({
  name: 'image_board'
})
export class ImageBoard extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: false, unsigned: true })
  userId: number;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)'})
  createdAt: Date;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id'})
  member: Member;

  @OneToMany(
    () => ImageData,
    (imageData) => imageData.imageBoard,
    { eager: false }
  )
  imageDatas: ImageData[];
}