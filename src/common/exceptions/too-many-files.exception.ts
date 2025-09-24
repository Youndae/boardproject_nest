import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class TooManyFilesException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.TOO_MANY_FILES;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}