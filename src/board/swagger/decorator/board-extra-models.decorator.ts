import { ApiExtraModels } from '@nestjs/swagger';
import { BoardListResponseDTO } from '#board/dtos/out/board-list-response.dto';
import { BoardDetailResponseDTO } from '#board/dtos/out/board-detail-response.dto';
import { BoardPatchDetailResponseDTO } from '#board/dtos/out/board-patch-detail-response.dto';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';
import { BoardReplyDataDTO } from '#board/dtos/out/board-reply-data.dto';

export function ApiBoardExtraModels(...models: any[]): ClassDecorator {

  return ApiExtraModels(
    ...models,
    BoardListResponseDTO,
    UserStatusDTO,
    BoardDetailResponseDTO,
    BoardPatchDetailResponseDTO,
    BoardReplyDataDTO,
  )
}