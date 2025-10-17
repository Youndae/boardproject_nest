import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class PatchImageBoardDTO {

  @ApiProperty({
    example: 'testImageBoardTitle',
    description: '게시글 제목'
  })
  @IsDefined({ message: 'imageTitle sholud not be null or undefined'})
  @IsString()
  @Length(2, 50, { message: 'imageTitle must be longer than or equal to 2 characters' })
  imageTitle: string;

  @ApiProperty({
    example: 'testImageBoardContent',
    description: '게시글 내용'
  })
  @IsDefined({ message: 'imageContent should not be null or undefined' })
  @IsNotEmpty({ message: 'imageContent is not empty' })
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