import { ApiProperty } from '@nestjs/swagger';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

export class ImageBoardDetailResponse {

  @ApiProperty({
    example: 'testImageBoardTitle',
    description: '게시글 제목'
  })
  title: string;

  @ApiProperty({
    example: 'testImageBoardContent',
    description: '게시글 내용'
  })
  content: string;

  @ApiProperty({
    example: 'testerNickname',
    description: '작성자 닉네임'
  })
  writer: string;

  @ApiProperty({
    example: 'tester',
    description: '작성자 아이디'
  })
  writerId: string;

  @ApiProperty({
    example: '2025-10-14T10:00:00.000Z',
    description: '작성일'
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    isArray: true,
    description: '이미지 데이터 리스트',
    example: ['image1.jpg', 'image2.jpg']
  })
  imageDataList: string[];

  constructor(entity: ImageBoard) {
    this.title = entity.title;
    this.content = entity.content;
    this.writer = entity.member.nickname!;
    this.writerId = entity.member.userId;
    this.createdAt = entity.createdAt;
    this.imageDataList = entity.imageDatas.map((entity) => entity.imageName);
  }
}