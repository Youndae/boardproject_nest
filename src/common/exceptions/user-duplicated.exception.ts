import { ConflictException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';
import { MemberCheckConstants } from '#member/constants/member-check.constants';

export class UserDuplicatedException extends ConflictException {
  constructor() {
    super({
      code: ResponseStatusConstants.CONFLICT.CODE,
      message: MemberCheckConstants.DUPLICATED
    });
  }
}