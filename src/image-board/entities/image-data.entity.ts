import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from '#member/entities/member.entity';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

@Entity({
  name: 'imageData'
})
export class ImageData extends BaseEntity {
  @Column({ type: 'varchar', length: 255, primary: true })
  imageName: string;

  @Column({ type: 'bigint', nullable: false, unsigned: true })
  imageNo: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  oldName: string;

  @Column({ type: 'int', nullable: false })
  imageStep: number;

  @ManyToOne(
    () => ImageBoard,
    {
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'imageNo', referencedColumnName: 'imageNo'})
  imageBoard: ImageBoard;
}
