import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class BadRequestException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.BAD_REQUEST;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}