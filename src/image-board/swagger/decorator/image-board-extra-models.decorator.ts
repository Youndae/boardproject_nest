import { ApiExtraModels } from '@nestjs/swagger';
import { ImageBoardListResponseDTO } from '#imageBoard/dtos/out/image-board-list-response.dto';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';
import { ImageBoardDetailResponseDTO } from '#imageBoard/dtos/out/image-board-detail-response.dto';
import { ImageBoardPatchDataResponseDTO } from '#imageBoard/dtos/out/image-board-patch-data-response.dto';

export function ApiImageBoardExtraModels(...models: any[]): ClassDecorator {
  return ApiExtraModels(
    ...models,
    ImageBoardListResponseDTO,
    UserStatusDTO,
    ImageBoardDetailResponseDTO,
    ImageBoardPatchDataResponseDTO
  )
}