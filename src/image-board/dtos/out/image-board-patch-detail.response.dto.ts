import { ApiProperty } from '@nestjs/swagger';
import { ImageDataResponse } from '#imageBoard/dtos/out/image-data.response.dto';
import { ImageBoardDetailResponse } from '#imageBoard/dtos/out/image-board-detail.response.dto';
import { ImageData } from '#imageBoard/entities/image-data.entity';

export class ImageBoardPatchDetailResponse {

  @ApiProperty({
    example: 'testImageTitle',
    description: '게시글 제목'
  })
  title: string;

  @ApiProperty({
    example: 'testImageContent',
    description: '게시글 내용'
  })
  content: string;

  @ApiProperty({
    type: String,
    isArray: true,
    description: '이미지명 목록',
    example: [
      'board/20251017214810002_uuid.jpg',
      'board/20251017214810003_uuid.jpg',
    ]
  })
  imageList: ImageDataResponse[];

  constructor(
    entity: ImageBoardDetailResponse,
    imageList: ImageData[]
  ) {
    this.title = entity.title;
    this.content = entity.content;
    this.imageList = imageList.map((entity: ImageData) => new ImageDataResponse(entity));
  }
}