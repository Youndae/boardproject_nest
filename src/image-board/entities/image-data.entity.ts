import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from '#member/entities/member.entity';

@Entity({
  name: 'imageData'
})
export class ImageData extends BaseEntity {
  @Column({ type: 'varchar', length: 255, primary: true })
  imageName: string;

  @Column({ type: 'bigint', nullable: false })
  imageNo: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  oldName: string;

  @Column({ type: 'int', nullable: false })
  imageStep: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  member: Member;
}
