import { ImageDataResponseDTO } from '#imageBoard/dtos/out/image-data-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

export class ImageBoardDetailResponseDTO {

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
    example: 'testImageBoardContent',
    description: '게시글 내용'
  })
  imageContent: string;

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
    type: () => [ImageDataResponseDTO],
    description: '이미지 데이터 리스트'
  })
  imageData: ImageDataResponseDTO[];

  constructor(entity: ImageBoard) {
    this.imageNo = entity.imageNo;
    this.imageTitle = entity.imageTitle;
    this.imageContent = entity.imageContent;
    this.userId = entity.userId;
    this.imageDate = entity.imageDate;
    this.imageData = entity.imageDatas.map((entity) => new ImageDataResponseDTO(entity));
  }
}