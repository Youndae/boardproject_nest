import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponse } from '#common/dtos/out/api.response.dto';
import { ListResponse } from '#common/dtos/out/list.response.dto';

export const ApiCombinedResponse = <TModel extends Type<any>>(model: TModel, isPage = false) => {
  return applyDecorators(
    ApiExtraModels(ApiResponse, ListResponse, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponse) },
          {
            properties: {
              content: isPage
                ? {
                  allOf: [
                    { $ref: getSchemaPath(ListResponse) },
                    {
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: getSchemaPath(model) },
                        },
                      },
                    },
                  ],
                }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};