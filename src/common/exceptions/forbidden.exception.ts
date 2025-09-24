import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class ForbiddenException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.FORBIDDEN;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}