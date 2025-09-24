import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class FileSizeTooLargeException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.FILE_SIZE_TOO_LARGE;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}