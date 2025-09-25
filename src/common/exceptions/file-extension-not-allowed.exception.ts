import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class FileExtensionNotAllowedException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.FILE_EXTENSION_NOT_ALLOWED;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}