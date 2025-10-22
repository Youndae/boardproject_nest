import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import {
  imageContentDefinedMessage, imageContentNotEmptyMessage,
  imageTitleDefinedMessage,
  imageTitleLengthMessage,
} from '#imageBoard/constants/image-board-validate-message.constants';

export class PatchImageBoardDTO {

  @ApiProperty({
    example: 'testImageBoardTitle',
    description: '게시글 제목'
  })
  @IsDefined({ message: imageTitleDefinedMessage})
  @IsString()
  @Length(2, 50, { message: imageTitleLengthMessage })
  imageTitle: string;

  @ApiProperty({
    example: 'testImageBoardContent',
    description: '게시글 내용'
  })
  @IsDefined({ message: imageContentDefinedMessage })
  @IsNotEmpty({ message: imageContentNotEmptyMessage })
  @IsString()
  imageContent: string;

  @ApiProperty({
    type: 'array',
    description: '삭제할 이미지 파일명'
  })
  @IsOptional()
  @IsArray()
  deleteFiles?: string[];
}