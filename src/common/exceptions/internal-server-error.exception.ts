import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class InternalServerErrorException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.INTERNAL_SERVER_ERROR;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}