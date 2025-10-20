import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, Length } from 'class-validator';

export class PostImageBoardDTO {

  @ApiProperty({
    example: 'testImageBoardTitle',
    description: '게시글 제목'
  })
  @IsDefined({ message: 'imageTitle should not be null or undefined'})
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
}