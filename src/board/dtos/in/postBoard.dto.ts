import { IsNotEmpty, IsString, Length } from 'class-validator';

export class PostBoardDTO {

  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  boardTitle: string;

  @IsNotEmpty()
  @IsString()
  boardContent: string;
}