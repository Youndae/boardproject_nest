import { HttpException } from '@nestjs/common';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export class TokenStealingException extends HttpException {
  constructor(message?: string) {
    const { MESSAGE, CODE } = ResponseStatusConstants.TOKEN_STEALING;
    const responseMessage = message ? message : MESSAGE;

    super(responseMessage, CODE);
  }
}