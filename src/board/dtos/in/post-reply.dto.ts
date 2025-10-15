import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsNumber, IsString, Length, Min } from 'class-validator';

export class PostReplyDTO {

  @ApiProperty({
    description: '게시글 답변 제목',
    example: 'testReplyTitle'
  })
  @IsDefined({ message: 'boardTitle should not be null or undefined' })
  @IsString()
  @Length(2, 50, { message: 'boardTitle must be longer than or equal to 2 characters' })
  boardTitle: string;

  @ApiProperty({
    description: '게시글 답변 내용',
    example: 'testReplyContent'
  })
  @IsDefined({ message: 'boardContent should not be null or undefined' })
  @IsNotEmpty({ message: 'boardContent is not empty' })
  @IsString()
  boardContent: string;

  @ApiProperty({
    description: '게시글 그룹 번호(최상위 글번호)',
    example: 1
  })
  @IsDefined({ message: 'boardGroupNo should not be null or undefined' })
  @IsNumber()
  @Min(1, { message: 'boardGroupNo less than 0'})
  boardGroupNo: number;

  @ApiProperty({
    description: '게시글 상위 글번호 목록(원본부터 최상위까지)',
    example: '1,3,5,7'
  })
  @IsDefined({ message: 'boardUpperNo should not be null or undefined' })
  @IsNotEmpty({ message: 'boardUpperNo is not empty' })
  @IsString()
  boardUpperNo: string;

  @ApiProperty({
    description: '원본 게시글 계층',
    example: 4
  })
  @IsDefined({ message: 'boardIndent should not be null or undefined' })
  @IsNumber()
  @Min(1, { message: 'boardIndent less than 0'})
  boardIndent: number;
}