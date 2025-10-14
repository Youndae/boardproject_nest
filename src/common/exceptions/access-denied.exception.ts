import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class AccessDeniedException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.ACCESS_DENIED;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}