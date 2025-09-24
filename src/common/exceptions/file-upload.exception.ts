import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class FileUploadException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.FILE_UPLOAD_ERROR;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}