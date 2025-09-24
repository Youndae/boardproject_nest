import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class UnauthorizedException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.UNAUTHORIZED;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}