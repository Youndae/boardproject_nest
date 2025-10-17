import { ApiProperty } from '@nestjs/swagger';

export class ImageBoardPatchDataResponseDTO {

  @ApiProperty({
    example: 1,
    description: '게시글 번호'
  })
  imageNo: number;

  @ApiProperty({
    example: 'testImageTitle',
    description: '게시글 제목'
  })
  imageTitle: string;

  @ApiProperty({
    example: 'testImageContent',
    description: '게시글 내용'
  })
  imageContent: string;

  @ApiProperty({
    type: 'array',
    description: '이미지명 목록'
  })
  imageData: string[];

  constructor(
    imageNo: number,
    imageTitle: string,
    imageContent: string,
    imageData: string[]
  ) {
    this.imageNo = imageNo;
    this.imageTitle = imageTitle;
    this.imageContent = imageContent;
    this.imageData = imageData;
  }
}