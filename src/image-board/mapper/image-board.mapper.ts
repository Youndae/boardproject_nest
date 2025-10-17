import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';
import { ImageBoardPatchDataResponseDTO } from '#imageBoard/dtos/out/image-board-patch-data-response.dto';
import { PostImageBoardDTO } from '#imageBoard/dtos/in/post-image-board.dto';
import { ImageBoard } from '#imageBoard/entities/image-board.entity';

export class ImageBoardMapper {
  static convertDetailDTOToPatchDataDTO(detailDTO: ImageBoardDetailResponseDTO): ImageBoardPatchDataResponseDTO {
    const imageNameArr: string[] = detailDTO.imageData.map((dto) => dto.imageName);

    return new ImageBoardPatchDataResponseDTO(
      detailDTO.imageNo,
      detailDTO.imageTitle,
      detailDTO.imageContent,
      imageNameArr
    );
  }

  static toEntityByPostImageBoardDTO(postDTO: PostImageBoardDTO, userId: string): ImageBoard {
    const entity: ImageBoard = new ImageBoard();
    entity.userId = userId;
    entity.imageTitle = postDTO.imageTitle;
    entity.imageContent = postDTO.imageContent;

    return entity;
  }
}