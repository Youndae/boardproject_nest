import { ApiProperty } from '@nestjs/swagger';
import { ImageBoardListRowType } from '#imageBoard/types/image-board-list.type';

export class ImageBoardListResponseDTO {
  @ApiProperty({
    example: 1,
    description: '게시글 번호'
  })
  imageNo: number;

  @ApiProperty({
    example: 'testImageBoardTitle',
    description: '게시글 제목'
  })
  imageTitle: string;

  @ApiProperty({
    example: 'tester',
    description: '작성자'
  })
  userId: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '작성일'
  })
  imageDate: Date;

  @ApiProperty({
    example: '20251017214810002_uuid.jpg',
    description: '썸네일'
  })
  imageName: string;

  constructor(entity: ImageBoardListRowType) {
    this.imageNo = entity.imageNo;
    this.imageTitle = entity.imageTitle;
    this.userId = entity.userId;
    this.imageDate = new Date(entity.imageDate);
    this.imageName = entity.imageName;
  }
}