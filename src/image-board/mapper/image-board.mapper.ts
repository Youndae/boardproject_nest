import { PostImageBoardRequest } from '#imageBoard/dtos/in/post-image-board.request.dto';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';
export class ImageBoardMapper {

  static toEntityByPostImageBoardDTO(postDTO: PostImageBoardRequest, userId: number): ImageBoard {
    const entity: ImageBoard = new ImageBoard();
    entity.userId = userId;
    entity.title = postDTO.title;
    entity.content = postDTO.content;

    return entity;
  }
}