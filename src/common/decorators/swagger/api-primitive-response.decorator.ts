import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse as NestApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponse } from '#common/dtos/out/api.response.dto';

export const ApiPrimitiveResponse = (
  type: 'string' | 'number' | 'integer' | 'boolean',
  status: 200 | 201 = 200,
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponse),
    NestApiResponse({
      status: status,
      description: status === 201 ? '데이터 생성 성공' : '요청 성공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponse) },
          {
            properties: {
              content: { type: type },
            },
          },
        ],
      },
    }),
  );
};