import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from '#member/entities/member.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

@Entity({
  name: 'image_data'
})
export class ImageData extends BaseEntity {
  @Column({ name: 'image_name', type: 'varchar', length: 255, primary: true })
  imageName: string;

  @Column({ name: 'image_id', type: 'bigint', nullable: false, unsigned: true })
  imageId: number;

  @Column({ name: 'origin_name', type: 'varchar', length: 255, nullable: false })
  originName: string;

  @Column({ name: 'image_step', type: 'int', nullable: false })
  imageStep: number;

  @ManyToOne(
    () => ImageBoard,
    {
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'image_id', referencedColumnName: 'id'})
  imageBoard: ImageBoard;
}
