import { applyDecorators } from '@nestjs/common';
import { ApiNoContentResponse } from '@nestjs/swagger';

export function ApiNoContentVoid(description = '처리 완료'): MethodDecorator {
  return applyDecorators(
    ApiNoContentResponse({
      description: `204 NoContent - ${description}`,
    })
  )
}