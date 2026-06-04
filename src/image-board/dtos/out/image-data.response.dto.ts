import { ApiProperty } from '@nestjs/swagger';
import { ImageData } from '#imageBoard/entities/image-data.entity';

export class ImageDataResponse {

  @ApiProperty({
    example: 'board/20251017214810002_uuid.jpg',
    description: '저장된 이미지 파일명'
  })
  imageName: string;

  @ApiProperty({
    example: 'testImage.jpg',
    description: '원본 이미지명'
  })
  originName: string;

  @ApiProperty({
    example: 1,
    description: '게시글 내 이미지 순서'
  })
  imageStep: number;

  constructor(entity: ImageData) {
    this.imageName = entity.imageName;
    this.originName = entity.originName;
    this.imageStep = entity.imageStep;
  }
}