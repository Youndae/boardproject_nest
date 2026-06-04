import { ApiProperty } from '@nestjs/swagger';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

export class ImageBoardListResponse {
  @ApiProperty({
    example: 1,
    description: '게시글 번호'
  })
  id: number;

  @ApiProperty({
    example: 'testImageBoardTitle',
    description: '게시글 제목'
  })
  title: string;

  @ApiProperty({
    example: 'board/20251017214810002_uuid.jpg',
    description: '썸네일'
  })
  imageName: string;

  constructor(entity: ImageBoard, imageName: string) {
    this.id = entity.id;
    this.title = entity.title;
    this.imageName = imageName;
  }
}