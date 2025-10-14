import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse } from '@nestjs/swagger';

export function CustomApiCreatedResponse(description: string, example: Object): MethodDecorator {
  return applyDecorators(
    ApiCreatedResponse({
      description: `201 Created - ${description}`,
      schema: {
        example: example
      }
    })
  )
}