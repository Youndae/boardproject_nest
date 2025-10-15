import { UserStatusDTO } from '#common/dtos/out/user-status.dto';
import type { Request } from 'express';
import { getUserId } from '#common/utils/auth.utils';

export class UserStatusDTOMapper {
  static createUserStatusByUserId(userId: string): UserStatusDTO {
    return new UserStatusDTO(userId);
  }

  static createUserStatusByReq(req: Request): UserStatusDTO {
    const userId: string | null = getUserId(req);

    return new UserStatusDTO(userId);
  }

}