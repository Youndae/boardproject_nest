import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class NotFoundException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.NOT_FOUND;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}