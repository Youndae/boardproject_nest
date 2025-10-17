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
  name: 'imageBoard'
})
export class ImageBoard extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  imageNo: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  imageTitle: string;

  @Column({ type: 'text', nullable: false })
  imageContent: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)'})
  imageDate: Date;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId'})
  member: Member;

  @OneToMany(
    () => ImageData,
    (imageData) => imageData.imageBoard,
    { eager: false }
  )
  imageDatas: ImageData[];
}