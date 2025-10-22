import { applyDecorators } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ResponseStatusConstants } from '#common/constants/response-status.constants';

export function ApiAuthExceptionResponse(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiForbiddenResponse({
      description: '접근 권한 없음',
      example: {
        statusCode: ResponseStatusConstants.FORBIDDEN.CODE,
        message: ResponseStatusConstants.FORBIDDEN.MESSAGE
      }
    }),
    ApiUnauthorizedResponse({
      description: '잘못된 JWT',
      example: {
        statusCode: ResponseStatusConstants.TOKEN_INVALID.CODE,
        message: ResponseStatusConstants.TOKEN_INVALID.MESSAGE
      }
    }),
    ApiUnauthorizedResponse({
      description: '탈취된 토큰',
      example: {
        statusCode: ResponseStatusConstants.TOKEN_STEALING.CODE,
        message: ResponseStatusConstants.TOKEN_STEALING.MESSAGE
      }
    }),
  )
}